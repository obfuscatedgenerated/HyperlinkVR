import { CircleUserRound } from "lucide-react";

const LOGIN_URL = "./tabs/login.html";

export const ProfileButton = () => {
    // TODO: auth state, for now assume not logged in

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
