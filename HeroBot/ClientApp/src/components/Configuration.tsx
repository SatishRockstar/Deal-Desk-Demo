// © Microsoft Corporation. All rights reserved.
import React, { useEffect, useState } from 'react';
import { useId, useBoolean } from '@fluentui/react-hooks';
import {
    Stack, Spinner, PrimaryButton, DefaultButton, IconButton, IButtonStyles, getTheme,
    mergeStyleSets,
    FontWeights,
    ContextualMenu,
    Toggle,
    Modal,
    IDragOptions,
    IIconProps,
    IStackProps,
} from '@fluentui/react';
import LocalPreview from './LocalPreview';
import LocalSettings from './LocalSettings';
import DisplayNameField from './CallDisplayNameField';
import {
    VideoDeviceInfo,
    AudioDeviceInfo,
    LocalVideoStream,
    DeviceManager,
    CallAgent,
    CallEndReason
} from '@azure/communication-calling';
import { VideoCameraEmphasisIcon } from '@fluentui/react-icons-northstar';
import {
    videoCameraIconStyle,
    configurationStackTokens,
    buttonStyle,
    localSettingsContainerStyle,
    mainContainerStyle,
    fullScreenStyle,
    verticalStackStyle
} from './styles/Configuration.styles';
import { AzureCommunicationTokenCredential } from '@azure/communication-common';

export type TokenResponse = {
    tokenCredential: AzureCommunicationTokenCredential;
    userId: string;
};

export interface CallConfigurationScreenProps {
    userId: string;
    groupId: string;
    callAgent: CallAgent;
    deviceManager: DeviceManager;
    setupCallClient(unsupportedStateHandler: () => void): void;
    setupCallAgent(
        displayName: string,
        groupId: string,
        afterSetupHandler: (callAgent: CallAgent, groupId: string) => void
    ): void;
    setGroup(groupId: string): void;
    startCallHandler(): void;
    unsupportedStateHandler: () => void;
    callEndedHandler: (reason: CallEndReason) => void;
    videoDeviceList: VideoDeviceInfo[];
    audioDeviceList: AudioDeviceInfo[];
    setVideoDeviceInfo(device: VideoDeviceInfo): void;
    setAudioDeviceInfo(device: AudioDeviceInfo): void;
    mic: boolean;
    setMic(mic: boolean): void;
    setLocalVideoStream(stream: LocalVideoStream | undefined): void;
    localVideoRendererIsBusy: boolean;
    videoDeviceInfo: VideoDeviceInfo;
    audioDeviceInfo: AudioDeviceInfo;
    localVideoStream: LocalVideoStream;
    screenWidth: number;
    joinGroup(callAgent: CallAgent, groupId: string): void;
    getToken(): Promise<TokenResponse>;
    createCallAgent(tokenCredential: AzureCommunicationTokenCredential, displayName: string): Promise<CallAgent>;
    registerToCallEvents(
        userId: string,
        callAgent: CallAgent,
        endCallHandler: (reason: CallEndReason) => void
    ): Promise<void>;
}

export default (props: CallConfigurationScreenProps): JSX.Element => {
    const spinnerLabel = 'Initializing call client...';
    const buttonText = 'Start call';

    const createUserId = (): string => 'user' + Math.ceil(Math.random() * 1000);

    const [name, setName] = useState(createUserId());
    const [emptyWarning, setEmptyWarning] = useState(false);

    const { groupId, setupCallClient, setGroup, unsupportedStateHandler } = props;

    const [isModalOpen, { setTrue: showModal, setFalse: hideModal }] = useBoolean(false);
    const [isDraggable, { toggle: toggleIsDraggable }] = useBoolean(false);
    const [keepInBounds, { toggle: toggleKeepInBounds }] = useBoolean(false);

    const dragOptions = React.useMemo(
        (): IDragOptions => ({
            moveMenuItemText: 'Move',
            closeMenuItemText: 'Close',
            menu: ContextualMenu,
            keepInBounds,
        }),
        [keepInBounds],
    );

    const titleId = useId('CallModalTitle');

    useEffect(() => {
        setupCallClient(unsupportedStateHandler);
    }, [setupCallClient, unsupportedStateHandler]);

    return (

        <Stack className={mainContainerStyle} horizontalAlign="center" verticalAlign="center">
            {props.deviceManager ? (
                <Stack
                    className={props.screenWidth > 750 ? fullScreenStyle : verticalStackStyle}
                    horizontal={props.screenWidth > 750}
                    horizontalAlign="center"
                    verticalAlign="center"
                    tokens={props.screenWidth > 750 ? configurationStackTokens : undefined}
                >
                    <LocalPreview
                        mic={props.mic}
                        setMic={props.setMic}
                        setLocalVideoStream={props.setLocalVideoStream}
                        videoDeviceInfo={props.videoDeviceInfo}
                        audioDeviceInfo={props.audioDeviceInfo}
                        localVideoStream={props.localVideoStream}
                        videoDeviceList={props.videoDeviceList}
                        audioDeviceList={props.audioDeviceList}
                    />
                    <Stack className={localSettingsContainerStyle}>
                        <DisplayNameField setName={setName} name={name} setEmptyWarning={setEmptyWarning} isEmpty={emptyWarning} />
                        <div>
                            <LocalSettings
                                videoDeviceList={props.videoDeviceList}
                                audioDeviceList={props.audioDeviceList}
                                audioDeviceInfo={props.audioDeviceInfo}
                                videoDeviceInfo={props.videoDeviceInfo}
                                setVideoDeviceInfo={props.setVideoDeviceInfo}
                                setAudioDeviceInfo={props.setAudioDeviceInfo}
                                deviceManager={props.deviceManager}
                            />
                        </div>
                        <div>
                            <PrimaryButton
                                className={buttonStyle}
                                onClick={async (): Promise<void> => {
                                    if (!name) {
                                        setEmptyWarning(true);
                                    } else {
                                        setEmptyWarning(false);
                                        //1. Retrieve a token
                                        const { tokenCredential, userId } = await props.getToken();
                                        //2. Initialize the call agent
                                        const callAgent = await props.createCallAgent(tokenCredential, name);
                                        //3. Register for calling events
                                        props.registerToCallEvents(userId, callAgent, props.callEndedHandler);
                                        //4. Join the call
                                        await props.joinGroup(callAgent, groupId);
                                        props.startCallHandler();
                                        setGroup(groupId);
                                    }
                                }}
                            >
                                <VideoCameraEmphasisIcon className={videoCameraIconStyle} size="medium" />
                                {buttonText}
                            </PrimaryButton>
                        </div>
                    </Stack>
                </Stack>
            ) : (
                    <Spinner label={spinnerLabel} ariaLive="assertive" labelPosition="top" />
                )}
        </Stack>

    );
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
