import { combineReducers } from 'redux';

import { RemoteParticipant, RemoteVideoStream } from '@azure/communication-calling';
import { ContosoActionTypes } from '../actions/ContosoClientAction';
import { ConversationsActionTypes } from '../actions/ConversationsAction';
import { MessagesActionTypes } from '../actions/MessagesAction';
import { ThreadActionTypes } from '../actions/ThreadAction';
import { ThreadMembersActionTypes } from '../actions/ThreadMembersAction';
import { ContosoReducer, ContosoState } from './ContosoClientReducers';
import { ConversationsReducer, ConversationsState } from './ConversationsReducers';
import { MessagesReducer, MessagesState } from './MessagesReducer';
import { ThreadReducer, ThreadState } from './ThreadReducers';
import { ThreadMembersReducer, ThreadMembersState } from './ThreadMembersReducers';
import { devicesReducer, DevicesState } from '../reducers/devices';
import { streamsReducer, StreamsState } from './streams';
import { controlsReducer, ControlsState } from './controls';
import { SdkState, sdkReducer } from './sdk';
import { CallsState, callsReducer } from './calls';
import { CallTypes } from '../actions/calls';
import { ControlTypes } from '../actions/controls';
import { DeviceTypes } from '../actions/devices';
import { SdkTypes } from '../actions/sdk';
import { StreamTypes } from '../actions/streams';


export interface State {
    chat: MessagesState;
    contosoClient: ContosoState;
    conversations: ConversationsState;
    thread: ThreadState;
    threadMembers: ThreadMembersState;
    calls: CallsState;
    devices: DevicesState;
    streams: StreamsState;
    controls: ControlsState;
    sdk: SdkState;
}

export interface ParticipantStream {
    user: RemoteParticipant;
    stream: RemoteVideoStream | undefined;
}

type TotalActions =
    | CallTypes
    | ControlTypes
    | DeviceTypes
    | SdkTypes
    | StreamTypes
    | MessagesActionTypes
    | ContosoActionTypes
    | ConversationsActionTypes
    | ThreadActionTypes
    | ThreadMembersActionTypes;

export const reducer = combineReducers({
    chat: MessagesReducer,
    contosoClient: ContosoReducer,
    conversations: ConversationsReducer,
    thread: ThreadReducer,
    threadMembers: ThreadMembersReducer,
    calls: callsReducer,
    devices: devicesReducer,
    streams: streamsReducer,
    controls: controlsReducer,
    sdk: sdkReducer
});
