import { wait } from '@testing-library/react';
import { connect } from 'react-redux';

import ConfigurationScreen from '../components/ConfigurationScreen';
import { addUserToThread, isValidThread,addThreadMemberMemory } from '../core/sideEffects';

//const mapDispatchToProps = (dispatch: any) => ({
//    setup: async () => {
//        dispatch(addUserToThread('LUIS', emoji));
//    },
//    isValidThread: async (threadId: string) => dispatch(isValidThread(threadId))
//});

const mapDispatchToProps = (dispatch: any) => ({

    setup: async (displayName: string, emoji: string) => {
        //dispatch(addUserToThread('Icertis Deal Desk', '🤖'));
            dispatch(addUserToThread(displayName, emoji));
    },
    isValidThread: async (threadId: string) => dispatch(isValidThread(threadId))
});

export default connect(undefined, mapDispatchToProps)(ConfigurationScreen);
