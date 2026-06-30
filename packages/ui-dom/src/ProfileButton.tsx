import { CircleUserRound } from "lucide-react";
import { useAuthSession, useMessageEngine } from "@hyperlinkvr/react";
import { ProfilePicture } from "./ProfilePicture";

export const ProfileButton = () => {
    const auth_session = useAuthSession();
    const messenger = useMessageEngine();

    if (auth_session) {
        // TODO: option to log out or open some profile
        return <ProfilePicture avatar_url={auth_session.avatar_url} username={auth_session.username} />
    }

    return (
        <button
            className="w-10 h-10 rounded-full text-white flex items-center justify-center cursor-pointer"
            title="Open login window"
            onClick={() => {
                messenger.send({
                    action: "HVR_CREATE_WINDOW",
                    intent: "LOGIN",
                    type: "popup",
                    width: 400,
                    height: 600,
                });

                window.close();
            }}
        >
            <CircleUserRound className="w-6 h-6" />
        </button>
    );
}
