export const Crosshair = () => {
    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-25">
            <div className="w-2 h-2 bg-white/75 rounded-full border-1 border-black/25" />
        </div>
    );
}
