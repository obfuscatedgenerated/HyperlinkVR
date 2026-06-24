import { CircleUserRound } from "lucide-react";
import { useAuthSession } from "~lib/auth/context";
import { Avatar } from "~components/dom/Avatar";

const LOGIN_URL = "./tabs/login.html";

export const ProfileButton = () => {
    const auth_session = useAuthSession();

    if (auth_session) {
        // TODO: option to log out or open some profile
        return <Avatar avatar_url={auth_session.avatar_url} username={auth_session.username} />
    }

    return (
        <button
            className="w-10 h-10 rounded-full text-white flex items-center justify-center cursor-pointer"
            title="Open login window"
            onClick={() => {
                chrome.windows.create({
                    url: LOGIN_URL,
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
