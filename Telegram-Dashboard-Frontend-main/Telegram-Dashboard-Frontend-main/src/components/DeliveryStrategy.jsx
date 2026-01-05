import { Layers, Info, Clock } from 'lucide-react';
import TimePicker from './TimePicker';
import { ChannelPriorityList } from './ChannelPriorityList';
import { hoursToDuration, durationToHours, formatDurationInput } from '../utils/durationUtils';

export function DeliveryStrategy({
    schedulingMode,
    setSchedulingMode,
    delayMinutes,
    setDelayMinutes,
    scheduleDate,
    setScheduleDate,
    scheduleTime,
    setScheduleTime,
    expiryHours,
    setExpiryHours,
    orderedChannels,
    setOrderedChannels,
    globalPinDelay,
    setGlobalPinDelay,
    globalPinExpiry,
    setGlobalPinExpiry,
    showPriorityList = true
}) {
    return (
        <div className="bg-white rounded-2xl p-6 card-shadow border border-gray-100 space-y-6">
            <div className="flex items-center justify-center gap-2 pb-4 border-b border-gray-100">
                <Layers className="w-5 h-5 text-primary-500" />
                <h2 className="text-lg font-bold text-gray-900">Delivery Strategy</h2>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
                {['immediate', 'delay', 'schedule'].map((mode) => (
                    <button
                        key={mode}
                        type="button"
                        onClick={() => setSchedulingMode(mode)}
                        className={`py-2 px-3 rounded-lg text-sm font-bold capitalize transition-all ${schedulingMode === mode
                            ? 'bg-white text-primary-600 shadow-sm border border-gray-200'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                            }`}
                    >
                        {mode}
                    </button>
                ))}
            </div>

            {/* Mode: Immediate */}
            {schedulingMode === 'immediate' && (
                <div className="p-4 bg-blue-50 text-blue-700 rounded-xl text-sm flex items-start gap-3">
                    <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p>Messages will be sent to all selected channels immediately using the worker queue.</p>
                </div>
            )}

            {/* Mode: Delay */}
            {schedulingMode === 'delay' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Delay Between Channels (Minutes)</label>
                        <input
                            type="number"
                            min="1"
                            value={delayMinutes}
                            onChange={(e) => setDelayMinutes(parseInt(e.target.value) || 1)}
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-primary-500 focus:outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Pin Delay (Minutes)</label>
                            <input
                                type="number"
                                min="0"
                                placeholder="0 (No Pin)"
                                value={globalPinDelay || ''}
                                onChange={(e) => setGlobalPinDelay(parseInt(e.target.value) || 0)}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-primary-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Unpin After (Minutes)</label>
                            <input
                                type="number"
                                min="0"
                                placeholder="0 (Never)"
                                value={globalPinExpiry || ''}
                                onChange={(e) => setGlobalPinExpiry(parseInt(e.target.value) || 0)}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-primary-500 focus:outline-none"
                            />
                        </div>
                    </div>
                    {showPriorityList && orderedChannels && (
                        <div className="border-t border-gray-100 pt-4">
                            <ChannelPriorityList
                                channels={orderedChannels}
                                setOrderedChannels={setOrderedChannels}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Mode: Schedule */}
            {schedulingMode === 'schedule' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Start Date</label>
                        <input
                            type="date"
                            value={scheduleDate}
                            onChange={(e) => setScheduleDate(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none"
                        />
                    </div>
                    {scheduleDate && (
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Start Time</label>
                            <TimePicker value={scheduleTime} onChange={setScheduleTime} />
                        </div>
                    )}
                </div>
            )}

            {/* Common Options */}
            <div className="border-t border-gray-100 pt-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" /> Auto-Delete After (DD:HH:MM:SS)
                </label>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="00:00:00:00"
                        value={hoursToDuration(expiryHours)}
                        onChange={(e) => {
                            const formatted = formatDurationInput(e.target.value);
                            setExpiryHours(durationToHours(formatted));
                        }}
                        className="w-full px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none text-sm font-mono"
                    />
                    <div className="mt-1 text-[10px] text-gray-400">
                        Format: Days : Hours : Minutes : Seconds
                    </div>
                </div>
            </div>
        </div>
    );
}
