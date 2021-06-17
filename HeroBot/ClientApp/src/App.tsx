import {
    loadTheme, initializeIcons, getTheme,
    mergeStyleSets,
    FontWeights,
    ContextualMenu,
    Toggle,
    Modal,
    IDragOptions,
    IIconProps,
    Stack,
    IStackProps,
} from '@fluentui/react';
import { useId, useBoolean } from '@fluentui/react-hooks';
import React, { useState, useEffect } from 'react';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import GroupCall from './containers/GroupCall';
import EndCall from './components/EndCall';
import ChatScreen from './containers/ChatScreen';
import ConfigurationScreen from './containers/ConfigurationScreen';
import CallConfigurationScreen from './containers/Configuration';
import EndScreen from './components/EndScreen';
import RemovedFromThreadScreen from './components/RemovedFromThreadScreen';
import HomeScreen from './containers/HomeScreen';
import { reducer } from './core/reducers/index';
import { getBuildTime, getChatSDKVersion, getThreadId, getGroupIdFromUrl } from './utils/utils';
import { CallEndReason } from '@azure/communication-calling';
import { v1 as createGUID } from 'uuid';
import { Route } from 'react-router';
import { DefaultButton, IconButton, IButtonStyles } from '@fluentui/react/lib/Button';

console.info(`Azure Communication Services chat sample using @azure/communication-chat : ${getChatSDKVersion()}`);
console.info(`Build Date : ${getBuildTime()}`);

loadTheme({});
initializeIcons();

const store = createStore(reducer, applyMiddleware(thunk));

export default (): JSX.Element => {

    const [page, setPage] = useState('home');
    const [callEndReason, setCallEndReason] = useState<CallEndReason | undefined>();
    const [groupId, setGroupId] = useState('');
    const [screenWidth, setScreenWidth] = useState(0);
    const [localVideoStream, setLocalVideoStream] = useState(undefined);

    const [isModalOpen, { setTrue: showModal, setFalse: hideModal }] = useBoolean(false);
    const [isCallModalOpen, { setTrue: showCallModal, setFalse: hideCallModal }] = useBoolean(false);
    const [isDraggable, { toggle: toggleIsDraggable }] = useBoolean(true);
    const [keepInBounds, { toggle: toggleKeepInBounds }] = useBoolean(false);

    useEffect(() => {
        const setWindowWidth = (): void => {
            const width = typeof window !== 'undefined' ? window.innerWidth : 0;
            setScreenWidth(width);
        };
        setWindowWidth();
        window.addEventListener('resize', setWindowWidth);
        return (): void => window.removeEventListener('resize', setWindowWidth);
    }, []);

    const getGroupId = (): string => {
        if (groupId) return groupId;
        const uriGid = getGroupIdFromUrl();
        const gid = uriGid == null || uriGid === '' ? createGUID() : uriGid;
        setGroupId(gid);
        return gid;
    };

    const dragOptions = React.useMemo(
        (): IDragOptions => ({
            moveMenuItemText: 'Move',
            closeMenuItemText: 'Close',
            menu: ContextualMenu,
            keepInBounds,
        }),
        [keepInBounds],
    );

    const titleId = useId('title');
    const callTitleId = useId('callTitle');
    //<Route path='/' component={() => {

    const getComponent = () => {
        if (page === 'home') {
            return (
                <div>
                    <HomeScreen />
                </div>
            );
        }
        else if (page === 'configuration') {
            return <ConfigurationScreen joinChatHandler={() => setPage('chat')} />;
        }
        else if (page === 'chat') {
            return (
                <ChatScreen
                    removedFromThreadHandler={() => setPage('removedFromThread')}
                    leaveChatHandler={() => setPage('end')}
                    startCallHandler={(): void => {
                        // window.history.pushState({}, document.title, window.location.href + '?groupId=' + getGroupId());
                        // window.open(window.location.href+ '?groupId=' + getGroupId(), '_blank');

                        // setPage('callConfiguration');
                        showModal();
                        
                    }}
                />
            );
        }
        else if (page === 'callConfiguration') {
            return (
                <CallConfigurationScreen
                    startCallHandler={(): void => setPage('call')}
                    unsupportedStateHandler={(): void => setPage('unsupported')}
                    callEndedHandler={(errorMsg: CallEndReason): void => {
                        setCallEndReason(errorMsg);
                        setPage('error');
                    }}
                    groupId={getGroupId()}
                    screenWidth={screenWidth}
                    localVideoStream={localVideoStream}
                    setLocalVideoStream={setLocalVideoStream}
                />
            );
        }
        else if (page === 'call') {
            return (
                <GroupCall
                    endCallHandler={(): void => setPage('endCall')}
                    groupId={getGroupId()}
                    screenWidth={screenWidth}
                    localVideoStream={localVideoStream}
                    setLocalVideoStream={setLocalVideoStream}
                />
            );
        }
        else if (page === 'endCall') {
            return (
                <EndCall
                    message={'You left the call'}
                    rejoinHandler={(): void => {
                        window.location.reload();
                    }}
                    homeHandler={(): void => {
                        window.location.href = window.location.href.split('?')[0];
                    }}
                />
            );
        }
        else if (page === 'end') {
            return (
                <EndScreen
                    rejoinHandler={() => {
                        window.location.href = window.location.href;
                    }}
                    homeHandler={() => (window.location.href = window.location.origin)}
                />
            );
        }
        else if (page === 'removedFromThread') {
            return <RemovedFromThreadScreen homeHandler={() => (window.location.href = window.location.origin)} />;
        }
    };

    //}} />
    if (getThreadId() && page === 'home') {
        setPage('configuration');
    }

    return <Provider store={store}>{getComponent()}
        <Modal
            titleAriaId={titleId}
            isOpen={isModalOpen}
            onDismiss={hideModal}
            isModeless={true}
            isBlocking={false}
            containerClassName={contentStyles.container}
            dragOptions={isDraggable ? dragOptions : undefined}
        >
            <div className={contentStyles.header}>
                <span id={titleId}>Select your devices</span>
                <IconButton
                    styles={iconButtonStyles}
                    iconProps={cancelIcon}
                    ariaLabel="Close popup modal"
                    onClick={hideModal}
                />
            </div>
            <div className={contentStyles.body}>
                <CallConfigurationScreen
                    startCallHandler={() => { hideModal(); showCallModal(); }}
                    unsupportedStateHandler={(): void => setPage('unsupported')}
                    callEndedHandler={(errorMsg: CallEndReason): void => {
                        setCallEndReason(errorMsg);
                        setPage('error');
                    }}
                    groupId={getGroupId()}
                    screenWidth={screenWidth}
                    localVideoStream={localVideoStream}
                    setLocalVideoStream={setLocalVideoStream}
                />
            </div>
        </Modal>
        <Modal
            titleAriaId={callTitleId}
            isOpen={isCallModalOpen}
            onDismiss={hideCallModal}
            isModeless={true}
            isBlocking={false}
            containerClassName={contentStyles.container}
            dragOptions={isDraggable ? dragOptions : undefined}
        >
            <div className={contentStyles.header}>
                <span id={callTitleId}>Ongoing call</span>
                <IconButton
                    styles={iconButtonStyles}
                    iconProps={cancelIcon}
                    ariaLabel="Close popup modal"
                    onClick={hideCallModal}
                />
            </div>
            <div className={contentStyles.body}>
                <GroupCall
                    endCallHandler={(): void => hideCallModal()}
                    groupId={getGroupId()}
                    screenWidth={screenWidth}
                    localVideoStream={localVideoStream}
                    setLocalVideoStream={setLocalVideoStream}
                />
            </div>
        </Modal>
    </Provider>;
};

const cancelIcon: IIconProps = { iconName: 'Cancel' };

const theme = getTheme();
const contentStyles = mergeStyleSets({
    container: {
        display: 'flex',
        flexFlow: 'column nowrap',
        alignItems: 'stretch',
    },
    header: [
        theme.fonts.xLargePlus,
        {
            flex: '1 1 auto',
            borderTop: `4px solid ${theme.palette.themePrimary}`,
            color: theme.palette.neutralPrimary,
            display: 'flex',
            alignItems: 'center',
            fontWeight: FontWeights.semibold,
            padding: '12px 12px 14px 24px',
        },
    ],
    body: {
        flex: '4 4 auto',
        padding: '0 24px 24px 24px',
        overflowY: 'hidden',
        selectors: {
            p: { margin: '14px 0' },
            'p:first-child': { marginTop: 0 },
            'p:last-child': { marginBottom: 0 },
        },
    },
});
const stackProps: Partial<IStackProps> = {
    horizontal: true,
    tokens: { childrenGap: 40 },
    styles: { root: { marginBottom: 20 } },
};
const iconButtonStyles: Partial<IButtonStyles> = {
    root: {
        color: theme.palette.neutralPrimary,
        marginLeft: 'auto',
        marginTop: '4px',
        marginRight: '2px',
    },
    rootHovered: {
        color: theme.palette.neutralDark,
    },
};
