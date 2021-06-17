import { Dispatch } from 'redux';
import React, { useReducer } from 'react';
import * as AdaptiveCards from "adaptivecards";
import {
    MINIMUM_TYPING_INTERVAL_IN_MILLISECONDS,
    MAXIMUM_INT64,
    PAGE_SIZE,
    INITIAL_MESSAGES_SIZE,
    OK
} from '../constants';
import { setChatClient, setContosoUser, setContosoUsers } from './actions/ContosoClientAction';
import { setReceipts } from './actions/ConversationsAction';
import { setMessages, setTypingNotifications, setTypingUsers, setFailedMessages } from './actions/MessagesAction';
import { setThreadId, setThreadTopicName } from './actions/ThreadAction';
import { setThreadMembers, setThreadMembersError, setRemovedFromThread } from './actions/ThreadMembersAction';
import { User } from './reducers/ContosoClientReducers';
import { State } from './reducers/index';
import { ClientChatMessage } from './reducers/MessagesReducer';
import {
    compareMessages,
    convertToClientChatMessage,
    createNewClientChatMessage,
    isUserMatchingIdentity
} from '../utils/utils';

import {
    ChatClient,
    ChatThreadClient,
    SendReadReceiptRequest,
    ChatMessageReadReceipt,
    ChatMessage,
    ChatParticipant
} from '@azure/communication-chat';
import {
    AzureCommunicationTokenCredential,
    CommunicationTokenRefreshOptions,
    CommunicationUserIdentifier,
    CommunicationIdentifier
} from '@azure/communication-common';
import {
    ChatThreadPropertiesUpdatedEvent,
    CommunicationUserKind,
    ParticipantsAddedEvent,
    ParticipantsRemovedEvent
} from '@azure/communication-signaling';
import { parse, stringify } from 'uuid';
import { Async } from '@fluentui/react';

// This function sets up the user to chat with the thread

const addUserToThread = (displayName: string, emoji: string) => async (dispatch: Dispatch, getState: () => State) => {

    let state: State = getState();

    console.log(state);
    console.log("dispatch", dispatch);
    let mem123 = state.threadMembers.threadMembers;
    console.log("Members", mem123)
    const luisExists = state.threadMembers.threadMembers.some(l => l.displayName === 'Icertis Deal Desk');
    console.log(`Icertis Deal Desk exists: ${luisExists}`);

    if (state.thread.threadId === undefined) {
        console.error('Thread Id not created yet');
        return;
    }
    let threadId: string = state.thread.threadId;

    // get environment url from server
    let environmentUrl = await getEnvironmentUrl();

    if (environmentUrl === undefined) {
        console.error('unable to get environment url from server');
        return;
    }
    // create our user
    let userToken = await getToken();

    if (userToken === undefined) {
        console.error('unable to get a token');
        return;
    }

    const user = userToken.user as CommunicationUserIdentifier;

    let options: CommunicationTokenRefreshOptions = {
        token: userToken.token,
        tokenRefresher: () => refreshTokenAsync(user.communicationUserId),
        refreshProactively: true
    };

    let userAccessTokenCredentialNew = new AzureCommunicationTokenCredential(options);
    let chatClient = new ChatClient(environmentUrl, userAccessTokenCredentialNew);

    // set emoji for the user

    setEmoji(user.communicationUserId, emoji);

    // subscribe for message, typing indicator, and read receipt

    let chatThreadClient = await chatClient.getChatThreadClient(threadId);
    subscribeForMessage(chatClient, dispatch, getState);
    subscribeForTypingIndicator(chatClient, dispatch);
    subscribeForReadReceipt(chatClient, chatThreadClient, dispatch);
    subscribeForChatParticipants(chatClient, user.communicationUserId, dispatch, getState);
    subscribeForTopicUpdated(chatClient, dispatch, getState);
    dispatch(setThreadId(threadId));
    dispatch(setContosoUser(user.communicationUserId, userToken.token, displayName));
    dispatch(setChatClient(chatClient));

    await addThreadMemberHelper(
        threadId,
        {
            identity: user.communicationUserId,
            token: userToken.token,
            displayName: displayName,
            memberRole: 'User'
        },
        dispatch
    );

    await getThreadInformation(chatClient, dispatch, getState);
    await getMessages(chatClient, dispatch, getState);
};

const subscribeForTypingIndicator = async (chatClient: ChatClient, dispatch: Dispatch) => {
    await chatClient.startRealtimeNotifications();
    chatClient.on('typingIndicatorReceived', async (event) => {
        const fromId = (event.sender as CommunicationUserKind).communicationUserId;
        const typingNotification = {
            from: fromId,
            originalArrivalTime: event.receivedOn,
            recipientId: (event.recipient as CommunicationUserKind).communicationUserId,
            threadId: event.threadId,
            version: event.version
        };
        dispatch(setTypingNotifications(fromId, typingNotification));
    });
};

const subscribeForMessage = async (chatClient: ChatClient, dispatch: Dispatch, getState: () => State) => {
    console.log('inside messageSubscriber');
    await chatClient.startRealtimeNotifications();
    chatClient.on('chatMessageReceived', async (event) => {
        let state: State = getState();
        let messages: ClientChatMessage[] = state.chat.messages !== undefined ? state.chat.messages : [];
        if (!isUserMatchingIdentity(event.sender, state.contosoClient.user.identity)) {
            const clientChatMessage = {
                sender: event.sender,
                id: event.id,
                senderDisplayName: event.senderDisplayName,
                createdOn: event.createdOn,
                content: { message: event.message }
            };
            console.log(clientChatMessage);
            messages.push(clientChatMessage);
            //await processMessage(chatClient, clientChatMessage, getState, dispatch);
            dispatch(setMessages(messages.sort(compareMessages)));
        }

        //const chatMessage = {
        //    sender: event.sender,
        //    id: event.id,
        //    senderDisplayName: event.senderDisplayName,
        //    createdOn: event.createdOn,
        //    content: { message: event.message }
        //};
        // console.log(chatMessage);
        //await processMessage(chatClient, chatMessage, getState, dispatch);

    });
};

const subscribeForReadReceipt = async (
    chatClient: ChatClient,
    chatThreadClient: ChatThreadClient,
    dispatch: Dispatch
) => {
    console.log('inside readReceipt subscriber');
    await chatClient.startRealtimeNotifications();
    chatClient.on('readReceiptReceived', async (event) => {
        let receipts: ChatMessageReadReceipt[] = [];
        for await (let page of chatThreadClient.listReadReceipts().byPage()) {
            for (const receipt of page) {
                receipts.push(receipt);
            }
        }
        dispatch(setReceipts(receipts));
    });
};

const subscribeForChatParticipants = async (
    chatClient: ChatClient,
    identity: string,
    dispatch: Dispatch,
    getState: () => State
) => {
    console.log('inside ChatParticipants Subscriber');
    chatClient.on('participantsRemoved', async (event: ParticipantsRemovedEvent) => {
        const state = getState();
        let participants: ChatParticipant[] = [];
        for (let chatParticipant of event.participantsRemoved) {
            // if you are in the list, remove yourself from the chat
            if (isUserMatchingIdentity(chatParticipant.id, identity)) {
                dispatch(setRemovedFromThread(true));
                return;
            }
        }

        const originalParticipants = state.threadMembers.threadMembers;
        for (var i = 0; i < originalParticipants.length; i++) {
            const participantId = (originalParticipants[i].id as CommunicationUserIdentifier).communicationUserId;
            if (
                event.participantsRemoved.filter((chatParticipant) => isUserMatchingIdentity(chatParticipant.id, participantId))
                    .length === 0
            ) {
                participants.push(originalParticipants[i]);
            }
        }

        dispatch(setThreadMembers(participants));
    });

    chatClient.on('participantsAdded', async (event: ParticipantsAddedEvent) => {
        const state = getState();
        let participants: ChatParticipant[] = [...state.threadMembers.threadMembers];

        // there is a chance that the participant added is you and so there is a chance that you can come in as a
        // new participant as well
        const addedParticipants = event.participantsAdded.map((chatParticipant: ChatParticipant) => {
            return {
                id: chatParticipant.id,
                displayName: chatParticipant.displayName,
                shareHistoryTime: new Date(chatParticipant?.shareHistoryTime || new Date())
            };
        });

        // add participants not in the list
        for (var j = 0; j < event.participantsAdded.length; j++) {
            const addedParticipant = event.participantsAdded[j];
            const id = (addedParticipant.id as CommunicationUserIdentifier).communicationUserId;
            if (
                participants.filter((participant: ChatParticipant) => isUserMatchingIdentity(participant.id, id)).length === 0
            ) {
                participants.push(addedParticipant);
            }
        }

        // also make sure we get the emojis for the new participants
        let users = Object.assign({}, state.contosoClient.users);
        for (var i = 0; i < addedParticipants.length; i++) {
            var threadMember = addedParticipants[i];
            var identity = (threadMember.id as CommunicationUserIdentifier).communicationUserId;
            var user = users[identity];
            if (user == null) {
                var serverUser = await getEmoji(identity);
                if (serverUser !== undefined) {
                    users[identity] = { emoji: serverUser.emoji };
                }
            }
        }

        dispatch(setContosoUsers(users));
        dispatch(setThreadMembers(participants));
    });
};

const subscribeForTopicUpdated = async (chatClient: ChatClient, dispatch: Dispatch, getState: () => State) => {
    console.log('inside TopicUpdate subscriber');
    chatClient.on('chatThreadPropertiesUpdated', async (e: ChatThreadPropertiesUpdatedEvent) => {
        const state = getState();
        let threadId = state.thread.threadId;

        if (!threadId) {
            console.error('no threadId set');
            return;
        }

        dispatch(setThreadTopicName(e.properties.topic));
    });
};

const sendTypingNotification = () => async (dispatch: Dispatch, getState: () => State) => {
    console.log('inside typingNotification Subscriber');
    let state: State = getState();
    let chatClient = state.contosoClient.chatClient;
    if (chatClient === undefined) {
        console.error('Chat Client not created yet');
        return;
    }
    let threadId = state.thread.threadId;
    if (threadId === undefined) {
        console.error('Thread Id not created yet');
        return;
    }
    await sendTypingNotificationHelper(await chatClient.getChatThreadClient(threadId));
};

const updateTypingUsers = () => async (dispatch: Dispatch, getState: () => State) => {
    //console.log('inside TypingUser subscriber');
    let typingUsers = [];
    let state: State = getState();
    let typingNotifications = state.chat.typingNotifications;
    for (let id in typingNotifications) {
        let typingNotification = typingNotifications[id];
        if (!typingNotification.originalArrivalTime) {
            continue;
        }
        if (shouldDisplayTyping(typingNotification.originalArrivalTime)) {
            let threadMember = state.threadMembers.threadMembers.find((threadMember) =>
                isUserMatchingIdentity(threadMember.id, id)
            );
            if (threadMember) {
                typingUsers.push(threadMember);
            }
        }
    }
    dispatch(setTypingUsers(typingUsers));
};

const shouldDisplayTyping = (lastReceivedTypingEventDate: number) => {
    // console.log('inside displaytyping subscriber');
    let currentDate = new Date();
    let timeSinceLastTypingNotificationMs = currentDate.getTime() - lastReceivedTypingEventDate;
    return timeSinceLastTypingNotificationMs <= MINIMUM_TYPING_INTERVAL_IN_MILLISECONDS;
};

const sendMessageOverride = (messageContent: string, userId: string, displayName: string) => async (dispatch: Dispatch, getState: () => State) => {
    console.log('inside overriden SendMessage');
    let state: State = getState();
    let chatClient = state.contosoClient.chatClient;

    if (chatClient === undefined) {
        console.error('Chat Client not created yet');
        return;
    }
    let threadId = state.thread.threadId;
    if (threadId === undefined) {
        console.error('Thread Id not created yet');
        return;
    }

    //let displayName = state.contosoClient.user.displayName;
    //let userId = state.contosoClient.user.identity;

    // we use this client message id to have a local id for messages
    // if we fail to send the message we'll at least be able to show that the message failed to send on the client

    let clientMessageId = (Math.floor(Math.random() * MAXIMUM_INT64) + 1).toString(); //generate a random unsigned Int64 number

    let newMessage = createNewClientChatMessage(userId, displayName, clientMessageId, messageContent);

    let messages = getState().chat.messages;
    messages.push(newMessage);
    dispatch(setMessages(messages));

    await sendMessageHelper(
        await chatClient.getChatThreadClient(threadId),
        messageContent,
        displayName,
        clientMessageId,
        dispatch,
        getState
    );

}

const sendMessage = (messageContent: string) => async (dispatch: Dispatch, getState: () => State) => {
    console.log('inside SendMessage');
    let state: State = getState();
    let chatClient = state.contosoClient.chatClient;
    if (chatClient === undefined) {
        console.error('Chat Client not created yet');
        return;
    }
    let threadId = state.thread.threadId;
    if (threadId === undefined) {
        console.error('Thread Id not created yet');
        return;
    }
    let displayName = state.contosoClient.user.displayName;
    let userId = state.contosoClient.user.identity;

    // we use this client message id to have a local id for messages
    // if we fail to send the message we'll at least be able to show that the message failed to send on the client

    let clientMessageId = (Math.floor(Math.random() * MAXIMUM_INT64) + 1).toString(); //generate a random unsigned Int64 number

    let newMessage = createNewClientChatMessage(userId, displayName, clientMessageId, messageContent);

    let messages = getState().chat.messages;
    messages.push(newMessage);
    dispatch(setMessages(messages));

    await sendMessageHelper(
        await chatClient.getChatThreadClient(threadId),
        messageContent,
        displayName,
        clientMessageId,
        dispatch,
        getState
    );

    await processMessage(chatClient, newMessage, getState, dispatch);


};

const isValidThread = (threadId: string) => async (dispatch: Dispatch) => {
    console.log('inside isValidThread');
    try {
        let validationRequestOptions = { method: 'GET' };
        let validationResponse = await fetch('/isValidThread/' + threadId, validationRequestOptions);
        if (validationResponse.status === 200) {
            dispatch(setThreadId(threadId));
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error('Failed at getting isThreadIdValid, Error: ', error);
    }
};

const getMessages = async (chatClient: ChatClient, dispatch: Dispatch, getState: () => State) => {
    console.log('inside getMessages');
    let state: State = getState();
    if (chatClient === undefined) {
        console.error('Chat Client not created yet');
        return;
    }
    let threadId = state.thread.threadId;
    if (threadId === undefined) {
        console.error('Thread Id not created yet');
        return;
    }
    let messages = await getMessagesHelper(await chatClient.getChatThreadClient(threadId));
    if (messages === undefined) {
        console.error('unable to get messages');
        return;
    }

    const reversedClientChatMessages: ClientChatMessage[] = messages
        .map((message) => convertToClientChatMessage(message))
        .reverse();

    return dispatch(setMessages(reversedClientChatMessages));
};

const createThread = async () => {
    console.log('inside createThread');
    let threadId = await createThreadHelper();
    if (threadId !== null) {
        window.location.href += `?threadId=${threadId}`;
    } else {
        console.error('unable to generate a new chat thread');
    }
};

const addThreadMember = () => async (dispatch: Dispatch, getState: () => State) => {
    console.log('inside addThreadMember');
    let state: State = getState();
    let user = state.contosoClient.user;
    let threadId = state.thread.threadId;

    if (threadId === undefined) {
        console.error('Thread Id not created yet');
        return;
    }
    await addThreadMemberHelper(
        threadId,
        {
            identity: user.identity,
            token: user.token,
            displayName: user.displayName,
            memberRole: 'User'
        },
        dispatch
    );
};

const removeThreadMemberByUserId = (userId: string) => async (dispatch: Dispatch, getState: () => State) => {
    console.log('inside removeThreadMemberByUserId');
    let state: State = getState();
    let chatClient = state.contosoClient.chatClient;
    let threadId = state.thread.threadId;
    if (chatClient === undefined) {
        console.error("Chat client doesn't created yet");
        return;
    }
    if (threadId === undefined) {
        console.error('Thread Id not created yet');
        return;
    }
    let chatThreadClient = await chatClient.getChatThreadClient(threadId);
    try {
        await chatThreadClient.removeParticipant({
            communicationUserId: userId
        });
    } catch (error) {
        console.log(error);
    }
};

const getThreadMembers = () => async (dispatch: Dispatch, getState: () => State) => {
    console.log('inside getThreadMembers')
    let state: State = getState();
    let chatClient = state.contosoClient.chatClient;
    console.log("chatClient123", chatClient)
    if (chatClient === undefined) {
        console.error('Chat Client not created yet');
        return;
    }
    let threadId = state.thread.threadId;
    if (threadId === undefined) {
        console.error('Thread Id not created yet');
        return;
    }
    let chatThreadClient = await chatClient.getChatThreadClient(threadId);

    try {
        let threadMembers = [];
        for await (let page of chatThreadClient.listParticipants().byPage()) {
            for (const threadMember of page) {
                threadMembers.push(threadMember);
                console.log("threadMember123", threadMember)
            }
        }
        dispatch(setThreadMembers(threadMembers));
    } catch (error) {
        console.error('Failed at getting members, Error: ', error);
        dispatch(setThreadMembersError(true));
    }
};

// We want to grab everything about the chat thread that has occured before we register for events.
// We care about pre-existing messages, the chat topic, and the participants in this chat

const getThreadInformation = async (chatClient: ChatClient, dispatch: Dispatch, getState: () => State) => {
    console.log('inside getThreadInformation');
    let state: State = getState();
    if (chatClient === undefined) {
        console.error('Chat Client not created yet');
        return;
    }
    let threadId = state.thread.threadId;
    if (threadId === undefined) {
        console.error('Thread Id not created yet');
        return;
    }

    let chatThreadClient;
    let iteratableParticipants;
    let topic;

    try {
        chatThreadClient = chatClient.getChatThreadClient(threadId);
        iteratableParticipants = chatThreadClient.listParticipants();
        console.log("iteratableParticipants", iteratableParticipants)
    } catch (error) {
        console.error(error);
        dispatch(setThreadMembersError(true));
    }

    let chatParticipants = [];
    // This is just to get all of the members in a chat. This is not performance as we're not using paging
    if (!iteratableParticipants) {
        console.error('unable to resolve chat participant iterator');
        return; // really we need to alert that there was an error?
    }

    for await (const page of iteratableParticipants.byPage()) {
        for (const chatParticipant of page) {
            chatParticipants.push(chatParticipant);
        }
    }

    if (chatParticipants.length === 0) {
        console.error('unable to get members in the thread');
        return;
    }

    // remove undefined display name chat participants
    const validChatParticipants = chatParticipants.filter(
        (chatParticipant) => chatParticipant.displayName !== undefined && chatParticipant.id !== undefined
    );

    // get the emojis for the new participants
    let users = state.contosoClient.users;
    for (var i = 0; i < chatParticipants.length; i++) {
        var threadMember = chatParticipants[i];
        var identity = (threadMember.id as CommunicationUserIdentifier).communicationUserId;
        var user = users[identity];
        if (user == null) {
            var serverUser = await getEmoji(identity);
            if (serverUser !== undefined) {
                users[identity] = { emoji: serverUser.emoji };
            }
        }
    }

    const properties = await chatThreadClient?.getProperties();

    if (!properties) {
        console.error('no chat thread properties');
        return;
    }

    dispatch(setThreadId(threadId));
    dispatch(setThreadTopicName(properties.topic));
    dispatch(setContosoUsers(users));
    dispatch(setThreadMembers(validChatParticipants));
};


const updateThreadTopicName = async (

    chatClient: ChatClient,
    threadId: string,
    topicName: string,
    setIsSavingTopicName: React.Dispatch<boolean>
) => {
    console.log('inside updateThreadTopicName');
    const chatThreadClient = await chatClient.getChatThreadClient(threadId);
    updateThreadTopicNameHelper(chatThreadClient, topicName, setIsSavingTopicName);
};

// Thread Helper
const createThreadHelper = async () => {
    console.log('inside createThreadHelper');
    try {
        let createThreadRequestOptions = { method: 'POST' };
        let createThreadResponse = await fetch('/createThread', createThreadRequestOptions);
        let threadId = await createThreadResponse.text();
        return threadId;
    } catch (error) {
        console.error('Failed at creating thread, Error: ', error);
    }
};

const updateThreadTopicNameHelper = async (
    chatThreadClient: ChatThreadClient,
    topicName: string,
    setIsSavingTopicName: React.Dispatch<boolean>
) => {
    console.log('inside updateThreadTopicNameHelper');
    try {
        await chatThreadClient.updateTopic(topicName);
        setIsSavingTopicName(false);
    } catch (error) {
        console.error('Failed at updating thread property, Error: ', error);
    }
};

// Thread Member Helper
const addThreadMemberHelper = async (threadId: string, user: User, dispatch: Dispatch) => {
    console.log(`inside addThreadMemberHelper`);
    console.log(user);
    try {
        let body = {
            id: user.identity,
            displayName: user.displayName
        };
        let addMemberRequestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        };
        await fetch('/addUser/' + threadId, addMemberRequestOptions);
    } catch (error) {
        console.error('Failed at adding thread member, Error: ', error);
    }
};

// Message Helper
const sendMessageHelper = async (
    chatThreadClient: ChatThreadClient,
    messageContent: string,
    displayName: string,
    clientMessageId: string,
    dispatch: Dispatch,
    getState: () => State
) => {
    console.log("inside sendMessageHelper");
    // for real time messages we want to store it locally and render it and then sync it with the server message later
    // 1. send the message
    // 2. cache the message locally using the message.id
    // 3. when we get the server synced message we match with the message.id
    try {

        const messageResult = await chatThreadClient.sendMessage(
            { content: messageContent },
            { senderDisplayName: displayName }
        );
        const message: ChatMessage = await chatThreadClient.getMessage(messageResult.id);
        updateMessagesArray(dispatch, getState, convertToClientChatMessage(message, clientMessageId));
    } catch (error) {
        console.error('Failed at getting messages, Error: ', error);
        let failedMessages = getState().chat.failedMessages;
        failedMessages.push(clientMessageId);
        setFailedMessages(failedMessages);

        const message = getState().chat.messages.filter((message) => message.clientMessageId === clientMessageId)[0];
        message.failed = true;
        updateMessagesArray(dispatch, getState, message);
    }
};

const sendMessageHelperOverride = async (
    chatThreadClient: ChatThreadClient,
    messageContent: string,
    displayName: string,
    clientMessageId: string,
    participantId: CommunicationUserKind,
    dispatch: Dispatch,
    getState: () => State
) => {
    console.log("inside sendMessageHelperOverride");
    // for real time messages we want to store it locally and render it and then sync it with the server message later
    // 1. send the message
    // 2. cache the message locally using the message.id
    // 3. when we get the server synced message we match with the message.id

    try {
        const messageResult = await chatThreadClient.sendMessage(
            { content: messageContent },
            { senderDisplayName: displayName },
            //  { sender: participantId }
        );
        const message: ChatMessage = await chatThreadClient.getMessage(messageResult.id);
        console.log(message);
        message.sender = participantId;
        updateMessagesArray(dispatch, getState, convertToClientChatMessage(message, clientMessageId));
    } catch (error) {
        console.error('Failed at getting messages, Error: ', error);
        let failedMessages = getState().chat.failedMessages;
        failedMessages.push(clientMessageId);
        setFailedMessages(failedMessages);

        const message = getState().chat.messages.filter((message) => message.clientMessageId === clientMessageId)[0];
        message.failed = true;
        updateMessagesArray(dispatch, getState, message);
    }
};

// Merge our local messages with server synced messages
const updateMessagesArray = async (dispatch: Dispatch, getState: () => State, newMessage: ClientChatMessage) => {
    console.log('inside updateMessagesArray');
    console.log(newMessage);
    let state: State = getState();

    let messages: ClientChatMessage[] = state.chat.messages !== undefined ? state.chat.messages : [];

    console.log(state.chat.messages)

    // the message id is what we we get from the server when it is synced. There will be other server attributes
    // on the message but the id should be consistent.
    messages = messages.map((message: ClientChatMessage) => {

        return message.clientMessageId === newMessage.clientMessageId ? Object.assign({}, message, newMessage) : message;
    });
    console.log(messages)
    dispatch(setMessages(messages.sort(compareMessages)));
};

const getMessagesHelper = async (chatThreadClient: ChatThreadClient): Promise<ChatMessage[] | undefined> => {
    console.log("inside getMessagesHelper");

    try {
        let messages: ChatMessage[] = [];
        let getMessagesResponse = await chatThreadClient.listMessages({
            maxPageSize: PAGE_SIZE
        });

        let messages_temp = [];

        for await (let page of getMessagesResponse.byPage()) {
            for (const message of page) {
                messages_temp.push(message);
            }
        }

        while (true) {
            if (messages_temp === undefined) {
                console.error('Unable to get messages from server');
                return;
            }

            // filter and only return top 100 text messages
            messages.push(...messages_temp.filter((message) => message.type === 'text'));
            if (messages.length >= INITIAL_MESSAGES_SIZE) {
                return messages.slice(0, INITIAL_MESSAGES_SIZE);
            }
            // if there is no more messages
            break;
        }

        // console.log(messages);

        return messages.slice(0, INITIAL_MESSAGES_SIZE);
    } catch (error) {
        console.error('Failed at getting messages, Error: ', error);
    }
};

// Typing Notification Helper

const sendTypingNotificationHelper = async (chatThreadClient: ChatThreadClient) => {
    console.log("inside sendTypingNotificationHelper");

    try {
        await chatThreadClient.sendTypingNotification();
    } catch (error) {
        console.error('Failed at sending typing notification, Error: ', error);
    }
};

const getEnvironmentUrl = async () => {
    console.log("inside getEnvironmentUrl");

    try {
        let getRequestOptions = {
            method: 'GET'
        };
        let response = await fetch('/getEnvironmentUrl', getRequestOptions);
        return response.text().then((environmentUrl) => environmentUrl);
    } catch (error) {
        console.error('Failed at getting environment url, Error: ', error);
    }
};

// Token Helper
const getToken = async () => {
    console.log("inside getToken");

    try {
        let getTokenRequestOptions = {
            method: 'POST'
        };
        let getTokenResponse = await fetch('/token', getTokenRequestOptions);
        return getTokenResponse.json().then((_responseJson) => _responseJson);
    } catch (error) {
        console.error('Failed at getting token, Error: ', error);
    }
};

const processMessage = async (chatClient: ChatClient, message: ClientChatMessage, getState: () => State, dispatch: Dispatch,) => {
    console.log("inside processMessage");
    let state: State = getState();
    console.log(state);
    let clientMessageId = (Math.floor(Math.random() * MAXIMUM_INT64) + 1).toString(); //generate a random unsigned Int64 number
    // let _chatClient = state.contosoClient.chatClient;
    //let _chatClient = state.contosoClient.chatClient != undefined ? state.contosoClient.chatClient : new ChatClient();
    // let thread = await chatClient.getChatThreadClient(threadId);
    //console.log(message);
    try {
        let threadId = state.thread.threadId != undefined ? state.thread.threadId : '';
        //console.log(threadId);
        //var threadClient = await chatClient.getChatThreadClient(threadId)
        let failed = message.failed != null ? message.failed : false;
        //let communicationUserIdentifier = message.sender != null ? message.sender.communicationUserId : null;
        let communicationUserIdentifier = null;
        let body = {
            clientMessageId: message.clientMessageId,
            sender: message.sender,
            senderDisplayName: message.senderDisplayName,
            content: message.content,
            createdOn: message.createdOn,
            id: message.id,
            failed: failed,
            chatUrl: document.baseURI
        };
        let requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
            //body: body
        }
        let getProcessedResponse = await fetch('/processMessage', requestOptions);
        // console.log(‘getProcessedResponse’, getProcessedResponse);
        let processedMsg = await getProcessedResponse.text().then((_responseJson) => _responseJson);
        var cardtext = processedMsg;
        // console.log(‘processedMsg’, processedMsg);
        var cardJson: any;
        try {
            cardJson = JSON.parse(processedMsg);
            console.log('cardJson', cardJson);
            if (cardJson.type == 'AdaptiveCard') {
                var adaptiveCard = new AdaptiveCards.AdaptiveCard();
                adaptiveCard.parse(cardJson);
                var renderedCard = adaptiveCard.render();
                console.log(renderedCard);
                cardtext = renderedCard?.outerHTML != undefined ? renderedCard.outerHTML : ''
                console.log(cardtext);
            }
        } catch (e) {
            console.error('Failed parsing card json: ', e);
        }
        // if(processedMsg[‘’])
        //console.log(processedMsg);
        if (cardtext != "") {
            const luis = state.threadMembers.threadMembers.filter(member => member.displayName === 'Icertis Deal Desk')[0];
            let userId = (luis.id as CommunicationUserIdentifier).communicationUserId;
            console.log(userId)
            // let clientMessageId = (Math.floor(Math.random() * MAXIMUM_INT64) + 1).toString(); //generate a random unsigned Int64 number
            let newMessage = createNewClientChatMessage(userId, 'Icertis Deal Desk', clientMessageId, cardtext);
            let messages = getState().chat.messages;
            messages.push(newMessage);
            dispatch(setMessages(messages));
            await sendMessageHelperOverride(
                await chatClient.getChatThreadClient(threadId),
                cardtext,
                'Icertis Deal Desk',
                clientMessageId,
                luis.id as CommunicationUserKind,
                dispatch,
                getState
            );
        }
        //sendMessageOverride(processedMsg, userId, “LUIS”);
        //console.log(state.threadMembers.threadMembers.filter(member = member.displayName === ‘LUIS’));
        //let messages = getState().chat.messages;
        //messages.push(newMessage);
        //dispatch(setMessages(messages));
        //updateMessagesArray(dispatch, state)
        //await sendMessageHelper(
        //    await _chatClient.getChatThreadClient(threadId),
        //    ‘Hello’,
        //    ‘LUIS’,
        //    clientMessageId,
        //    dispatch,
        //    getState
        //);
    } catch (error) {
        console.error('Failed at getting token, Error: ', error);
    }
}
const refreshTokenAsync = async (userIdentity: string): Promise<string> => {
    console.log('inside refreshTokenAsync');
    return new Promise<string>((resolve, reject) => {
        return fetch('/refreshToken/' + userIdentity).then(
            (response) => {
                if (response.ok) {
                    resolve(response.json().then((json) => json.token));
                } else {
                    reject(new Error('error'));
                }
            },
            (error) => {
                reject(new Error(error.message));
            }
        );
    });
};

const setEmoji = async (userId: string, emoji: string) => {
    console.log('inside setEmoji');

    try {
        let getTokenRequestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Emoji: emoji })
        };
        await (await fetch('/userConfig/' + userId, getTokenRequestOptions)).json;
    } catch (error) {
        console.error('Failed at setting emoji, Error: ', error);
    }
};

const getEmoji = async (userId: string) => {
    console.log('inside getEmoji');

    try {
        let getTokenRequestOptions = {
            headers: { 'Content-Type': 'application/json' },
            method: 'GET'
        };
        return await (await fetch('/userConfig/' + userId, getTokenRequestOptions)).json();
    } catch (error) {
        console.error('Failed at getting emoji, Error: ', error);
    }
};

const sendReadReceipt = (messageId: string) => async (dispatch: Dispatch, getState: () => State) => {
    // This is sent when we get focus to this tab and see this message

    console.log('inside sendReadReceipt');

    let state: State = getState();
    let chatClient = state.contosoClient.chatClient;
    if (chatClient === undefined) {
        console.error('Chat Client not created yet');
        return;
    }
    let threadId = state.thread.threadId;
    if (threadId === undefined) {
        console.error('Thread Id not created yet');
        return;
    }
    await sendReadReceiptHelper(await chatClient.getChatThreadClient(threadId), messageId);
};

const sendReadReceiptHelper = async (chatThreadClient: ChatThreadClient, messageId: string) => {
    console.log('inside sendReadReceiptHelper');

    let postReadReceiptRequest: SendReadReceiptRequest = {
        chatMessageId: messageId
    };
    await chatThreadClient.sendReadReceipt(postReadReceiptRequest);
};

const addThreadMemberMemory = async (threadId: string, user: User, dispatch: Dispatch) => {
    console.log(`inside addThreadMemberMemory`);
    console.log(user);
    try {
        let luis = user.displayName;
        console.log("luis123", luis)

    } catch (error) {
        console.error('Failed at adding thread member, Error: ', error);
    }
};

export {
    sendMessage,
    getMessages,
    createThread,
    addThreadMember,
    getThreadMembers,
    addUserToThread,
    removeThreadMemberByUserId,
    getEmoji,
    setEmoji,
    sendReadReceipt,
    sendTypingNotification,
    updateTypingUsers,
    isValidThread,
    updateThreadTopicName,
    addThreadMemberMemory
};
