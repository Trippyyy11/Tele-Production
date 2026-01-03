import { useState } from 'react';
import { Smartphone, Monitor, Bell, Sun, Moon, Search, MoreVertical, Paperclip, Smile, Send, Menu, Check, CheckCheck, File as FileIcon, Download } from 'lucide-react';
import clsx from 'clsx';

function TelegramPreview({ content, type = 'message', className }) {
    const [isMobile, setIsMobile] = useState(true);
    const [isDark, setIsDark] = useState(false);
    const [viewMode, setViewMode] = useState('app'); // 'app' | 'notification'

    const messages = Array.isArray(content) ? content : [content];
    const currentTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false });

    // Helper to get media URL for notification thumbnail
    const getNotificationThumbnail = (msg) => {
        if (!msg || !msg.media) return null;

        let target = null;
        if (Array.isArray(msg.media)) {
            target = msg.media[0];
        } else {
            target = msg.media;
        }

        if (!target) return null;

        let src = null;
        let thumbType = 'photo';

        if (target instanceof File) {
            src = URL.createObjectURL(target);
            thumbType = target.type.startsWith('video') ? 'video' : (target.type.startsWith('image') ? 'photo' : 'document');
        } else if (typeof target === 'string') {
            src = target;
            thumbType = target.match(/\.(mp4|mov|avi)$/i) ? 'video' : 'photo';
        } else if (typeof target === 'object') {
            src = target.preview || (target.file instanceof File ? URL.createObjectURL(target.file) : null);
            thumbType = target.type || 'photo';
        }

        return src ? { src, type: thumbType } : null;
    };

    const notificationThumb = getNotificationThumbnail(messages[0]);

    const DesktopFrame = ({ children }) => (
        <div className={clsx(
            "w-full max-w-2xl h-[600px] rounded-xl shadow-2xl border flex flex-col overflow-hidden transition-all duration-500",
            isDark ? "bg-[#17212b] border-[#101921]" : "bg-white border-gray-300"
        )}>
            {/* Windows Style Title Bar */}
            <div className={clsx("h-8 flex items-center justify-between px-3 select-none", isDark ? "bg-[#242f3d]" : "bg-gray-100")}>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500">Telegram</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex gap-4">
                        <div className="w-3 h-[1px] bg-gray-400" />
                        <div className="w-3 h-3 border border-gray-400" />
                        <div className="w-3 h-3 text-gray-400 flex items-center justify-center">×</div>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative"
                style={{
                    backgroundImage: isDark ? 'url("https://w.wallhaven.cc/full/qz/wallhaven-qz39wd.jpg")' : 'url("https://blog.1a23.com/wp-content/uploads/sites/2/2020/02/Desktop.png")',
                    backgroundSize: 'cover'
                }}>
                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col relative">
                    {/* Header */}
                    <div className={clsx("h-14 flex items-center justify-between px-4 sticky top-0 z-10", isDark ? "bg-[#17212b]/90 backdrop-blur" : "bg-white/90 backdrop-blur")}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">CH</div>
                            <div>
                                <h3 className={clsx("font-bold text-sm", isDark ? "text-white" : "text-gray-900")}>Channel Name</h3>
                                <p className="text-[10px] text-gray-400">1.2M subscribers</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-gray-400">
                            <Search className="w-5 h-5 cursor-not-allowed hover:text-blue-400 transition-colors" />
                            <MoreVertical className="w-5 h-5 cursor-not-allowed hover:text-blue-400 transition-colors" />
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        <div className="flex justify-center my-4">
                            <span className={clsx("px-3 py-1 rounded-full text-[11px] font-medium sticky top-2 z-[5]", isDark ? "bg-[#17212b]/60 text-white" : "bg-gray-200/60 text-gray-700")}>
                                January 2
                            </span>
                        </div>
                        {children}
                    </div>

                    {/* Desktop Footer */}
                    <div className={clsx("p-3 flex items-center gap-3", isDark ? "bg-[#17212b]" : "bg-white")}>
                        <Paperclip className="w-6 h-6 text-gray-400 cursor-not-allowed" />
                        <div className={clsx("flex-1 h-10 rounded-lg flex items-center px-4 text-sm text-gray-400", isDark ? "bg-[#242f3d]" : "bg-gray-100")}>
                            Write a message...
                        </div>
                        <Smile className="w-6 h-6 text-gray-400 cursor-not-allowed" />
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-blue-500 cursor-not-allowed hover:bg-blue-50">
                            <Send className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const MobileFrame = ({ children }) => (
        <div className="relative shrink-0 group">
            {/* Outer Silhouette */}
            <div className="w-[300px] h-[600px] bg-gray-900 rounded-[3rem] p-3 shadow-2xl relative border-[4px] border-gray-800">
                {/* Side Buttons */}
                <div className="absolute -left-[6px] top-24 w-[3px] h-14 bg-gray-800 rounded-l-md" /> {/* Volume up */}
                <div className="absolute -left-[6px] top-40 w-[3px] h-14 bg-gray-800 rounded-l-md" /> {/* Volume down */}
                <div className="absolute -right-[6px] top-32 w-[3px] h-20 bg-gray-800 rounded-r-md" /> {/* Power */}

                {/* Inner Screen */}
                <div className="w-full h-full rounded-[2.5rem] bg-black overflow-hidden relative flex flex-col"
                    style={{
                        backgroundImage: isDark ? 'url("https://w.wallhaven.cc/full/qz/wallhaven-qz39wd.jpg")' : 'url("https://blog.1a23.com/wp-content/uploads/sites/2/2020/02/Desktop.png")',
                        backgroundSize: 'cover'
                    }}>

                    {/* Dynamic Island */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-50 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-gray-800 rounded-full ml-10" />
                    </div>

                    {/* Status Bar */}
                    <div className="h-10 flex items-center justify-between px-8 text-white text-[10px] font-bold z-40">
                        <span>{currentTime}</span>
                        <div className="flex items-center gap-1.5">
                            <span className="leading-none">5G</span>
                            <div className="w-5 h-2.5 border border-white/40 rounded-[2px] p-[1px] flex items-center">
                                <div className="h-full bg-white rounded-[1px] w-[80%]" />
                            </div>
                        </div>
                    </div>

                    {/* Chat Header */}
                    <div className={clsx("h-12 flex items-center gap-3 px-4 z-10", isDark ? "bg-[#242f3d]" : "bg-white")}>
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">CH</div>
                        <div className="flex-1">
                            <h3 className={clsx("font-bold text-xs leading-none", isDark ? "text-white" : "text-gray-900")}>Channel Name</h3>
                            <p className="text-[10px] text-gray-400 mt-0.5">subscribers</p>
                        </div>
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                    </div>

                    {/* Chat Box */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                        {children}
                    </div>

                    {/* Mobile Input */}
                    <div className={clsx("h-12 flex items-center px-4 gap-3 bg-opacity-95 backdrop-blur-sm", isDark ? "bg-[#242f3d]" : "bg-white")}>
                        <Smile className="w-5 h-5 text-gray-400" />
                        <div className={clsx("flex-1 h-8 rounded-full flex items-center px-3 text-[11px] text-gray-400", isDark ? "bg-[#17212b]" : "bg-gray-100")}>
                            Broadcast...
                        </div>
                        <Paperclip className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="h-4 bg-black/10 w-full" /> {/* Gesture bar area */}
                </div>
            </div>
        </div>
    );

    return (
        <div className={clsx("flex flex-col h-full", className)}>
            {/* Modern Device Toggle Toolbar */}
            <div className="flex items-center justify-between mb-6 bg-gray-50 p-1.5 rounded-2xl border border-gray-200">
                <div className="flex p-1 bg-gray-200/50 rounded-xl gap-1">
                    <button
                        onClick={() => { setIsMobile(true); setViewMode('app'); }}
                        className={clsx("flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-xs font-bold", (isMobile && viewMode === 'app') ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700")}
                    >
                        <Smartphone className="w-4 h-4" />
                        <span className="hidden sm:inline">Mobile</span>
                    </button>
                    <button
                        onClick={() => { setIsMobile(false); setViewMode('app'); }}
                        className={clsx("flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-xs font-bold", (!isMobile && viewMode === 'app') ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700")}
                    >
                        <Monitor className="w-4 h-4" />
                        <span className="hidden sm:inline">Desktop</span>
                    </button>
                    <button
                        onClick={() => setViewMode('notification')}
                        className={clsx("flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-xs font-bold", viewMode === 'notification' ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700")}
                    >
                        <Bell className="w-4 h-4" />
                        <span className="hidden sm:inline">Notification</span>
                    </button>
                </div>

                {viewMode === 'app' && (
                    <button
                        onClick={() => setIsDark(!isDark)}
                        className={clsx("p-2 rounded-xl transition-all border", isDark ? "bg-gray-800 text-yellow-400 border-gray-700" : "bg-white text-gray-500 border-gray-200 hover:border-blue-200 hover:text-blue-500")}
                    >
                        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>
                )}
            </div>

            {/* Preview Viewport */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-4">
                {viewMode === 'notification' ? (
                    <div className="w-[300px] h-[600px] bg-black rounded-[3rem] p-3 shadow-2xl relative border-[4px] border-gray-800">
                        <div className="w-full h-full rounded-[2.5rem] overflow-hidden relative flex flex-col pt-12 items-center px-4"
                            style={{ backgroundImage: 'url("https://w.wallhaven.cc/full/8o/wallhaven-8o9mpy.jpg")', backgroundSize: 'cover' }}>

                            {/* iOS Time & Date */}
                            <div className="text-white text-center mb-12">
                                <div className="text-5xl font-light tracking-tighter mb-1">{currentTime}</div>
                                <div className="text-sm font-medium opacity-80">Friday, January 2</div>
                            </div>

                            {/* Notification Bubble (iOS Style) */}
                            <div className="w-full bg-white/70 backdrop-blur-2xl rounded-3xl p-4 shadow-xl border border-white/20 animate-in fade-in slide-in-from-top-4 duration-700">
                                <div className="flex gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <div className="w-5 h-5 bg-blue-500 rounded-md flex items-center justify-center shadow-sm">
                                                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white fill-current"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8/3.59 8 8-3.59 8-8 8z" /></svg>
                                            </div>
                                            <span className="text-[11px] font-bold text-black/60 uppercase tracking-widest">Telegram</span>
                                            <span className="text-[10px] text-black/40 ml-auto">now</span>
                                        </div>
                                        <div className="font-bold text-sm text-gray-900 mb-0.5 truncate">Channel Name</div>
                                        <div className="text-xs text-gray-800 line-clamp-2 leading-tight">
                                            {messages[0]?.pollQuestion || messages[0]?.content || messages[0]?.text || "New broadcast incoming..."}
                                        </div>
                                    </div>
                                    {notificationThumb && (
                                        <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-black/5 shadow-sm bg-gray-200 flex items-center justify-center">
                                            {notificationThumb.type === 'video' ? (
                                                <video src={notificationThumb.src} className="w-full h-full object-cover" muted />
                                            ) : notificationThumb.type === 'photo' ? (
                                                <img src={notificationThumb.src} alt="thumb" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center p-1">
                                                    <FileIcon className="w-6 h-6 text-gray-400" />
                                                    <span className="text-[8px] text-gray-500 font-bold uppercase truncate w-10 text-center">Doc</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Bottom Home Indicator */}
                            <div className="absolute bottom-6 w-32 h-1 bg-white/40 rounded-full" />
                        </div>
                    </div>
                ) : isMobile ? (
                    <MobileFrame>
                        {messages.filter(m => m.content || m.text || m.pollQuestion).map((msg, idx) => (
                            <div key={idx} className="flex flex-col gap-1 max-w-[85%]">
                                <MessageBubble msg={msg} type={msg.type || type} isDark={isDark} time={currentTime} device="mobile" />
                            </div>
                        ))}
                    </MobileFrame>
                ) : (
                    <DesktopFrame>
                        {messages.filter(m => m.content || m.text || m.pollQuestion).map((msg, idx) => (
                            <div key={idx} className="flex flex-col gap-1 max-w-[65%]">
                                <MessageBubble msg={msg} type={msg.type || type} isDark={isDark} time={currentTime} device="desktop" />
                            </div>
                        ))}
                    </DesktopFrame>
                )}
            </div>
        </div>
    );
}

function MessageBubble({ msg, type, isDark, time, device }) {
    const isPoll = type === 'poll' || msg.pollQuestion;

    const mediaList = [];
    if (msg.media instanceof File) {
        mediaList.push({
            src: URL.createObjectURL(msg.media),
            type: msg.media.type.startsWith('video') ? 'video' : (msg.media.type.startsWith('image') ? 'photo' : 'document'),
            name: msg.media.name,
            size: msg.media.size
        });
    } else if (typeof msg.media === 'string') {
        mediaList.push({ src: msg.media, type: msg.media.match(/\.(mp4|mov|avi)$/i) ? 'video' : 'photo' });
    } else if (Array.isArray(msg.media)) {
        msg.media.forEach(m => {
            if (m instanceof File) {
                mediaList.push({
                    src: URL.createObjectURL(m),
                    type: m.type.startsWith('video') ? 'video' : (m.type.startsWith('image') ? 'photo' : 'document'),
                    name: m.name,
                    size: m.size
                });
            } else if (typeof m === 'string') {
                mediaList.push({ src: m, type: m.match(/\.(mp4|mov|avi)$/i) ? 'video' : 'photo' });
            } else if (m && typeof m === 'object') {
                const src = m.preview || (m.file instanceof File ? URL.createObjectURL(m.file) : null);
                let mediaType = m.type;
                if (!mediaType && m.file instanceof File) {
                    mediaType = m.file.type.startsWith('video') ? 'video' : (m.file.type.startsWith('image') ? 'photo' : 'document');
                }
                if (src || mediaType === 'document') {
                    mediaList.push({
                        src,
                        type: mediaType || 'photo',
                        name: m.name || (m.file ? m.file.name : 'Unknown'),
                        size: m.size || (m.file ? m.file.size : 0)
                    });
                }
            }
        });
    }

    let gridClass = "grid-cols-1";
    if (mediaList.length === 2) gridClass = "grid-cols-2";
    else if (mediaList.length >= 3) gridClass = "grid-cols-2";

    return (
        <div className={clsx(
            "rounded-2xl p-2 relative shadow-sm transition-all animate-in fade-in slide-in-from-bottom-2 duration-300",
            isDark ? "bg-[#212d3b] text-white" : "bg-white text-black",
            "rounded-tl-none border-t border-white/5",
            device === 'desktop' ? "text-sm" : "text-[13px]"
        )}>
            {isPoll && (
                <div className="p-1">
                    <div className="font-bold mb-3 text-[15px] leading-tight">{msg.pollQuestion || "Poll Question?"}</div>
                    <div className="space-y-1.5">
                        {(msg.pollOptions || ['Option 1', 'Option 2']).map((opt, i) => (
                            <div key={i} className={clsx(
                                "p-2.5 rounded-xl font-medium text-sm flex justify-between relative overflow-hidden group/opt cursor-pointer",
                                isDark ? "bg-[#1d2733] hover:bg-[#2c3949]" : "bg-[#f1f1f2] hover:bg-gray-200"
                            )}>
                                <span className="z-10 relative">{opt}</span>
                                <span className="z-10 relative font-normal opacity-50 italic">0%</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between opacity-50 font-medium">
                        <span className="text-[11px]">Anonymous Quiz</span>
                        <span className="text-[11px]">VOTE</span>
                    </div>
                </div>
            )}

            {!isPoll && mediaList.length > 0 && (
                <div className="space-y-1 mb-2">
                    {/* Photos and Videos Grid */}
                    {mediaList.filter(m => m.type !== 'document').length > 0 && (
                        <div className={clsx("grid gap-1 overflow-hidden rounded-xl", gridClass)}>
                            {mediaList.filter(m => m.type !== 'document').map((item, i) => (
                                <div key={i} className={clsx("relative", mediaList.filter(m => m.type !== 'document').length === 3 && i === 2 && "col-span-2", "aspect-square bg-black/5")}>
                                    {item.type === 'video' ? (
                                        <video src={item.src} className="w-full h-full object-cover" controls={false} muted />
                                    ) : (
                                        <img src={item.src} alt="" className="w-full h-full object-cover" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Documents List */}
                    {mediaList.filter(m => m.type === 'document').map((doc, i) => (
                        <div key={i} className={clsx(
                            "flex items-center gap-3 p-2 rounded-xl border animate-in fade-in slide-in-from-left-2 duration-300",
                            isDark ? "bg-[#1d2733] border-[#2c3949]" : "bg-[#f1f1f2] border-gray-200"
                        )}>
                            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center text-white shrink-0">
                                <FileIcon className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className={clsx("text-xs font-bold truncate", isDark ? "text-white" : "text-gray-900")}>
                                    {doc.name || 'document.pdf'}
                                </div>
                                <div className="text-[10px] opacity-60">
                                    {doc.size ? `${(doc.size / 1024).toFixed(1)} KB` : '1.2 MB'}
                                </div>
                            </div>
                            <Download className="w-4 h-4 opacity-40" />
                        </div>
                    ))}
                </div>
            )}

            {!isPoll && (msg.content || msg.text) && (
                <div className="whitespace-pre-wrap break-words px-1.5 font-sans leading-relaxed tracking-tight"
                    dangerouslySetInnerHTML={{ __html: msg.content || msg.text }} />
            )}

            <div className="flex items-center justify-end gap-1 mt-1 px-1">
                <span className={clsx("text-[10px] font-medium opacity-60", isDark ? "text-gray-400" : "text-gray-400")}>{time}</span>
                {device === 'mobile' && <CheckCheck className="w-3 h-3 text-blue-400 opacity-80" />}
            </div>
        </div>
    );
}

export default TelegramPreview;
