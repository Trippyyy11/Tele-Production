import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Wand2, Plus, Calendar } from 'lucide-react';
import { getCounterColor } from '../utils/uiUtils';

export function SortableQuizItem({ quiz, index, updateQuiz, removeQuiz, duplicateQuiz, updateOption, addOption, removeOption }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: quiz.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="bg-white border border-gray-100 card-shadow rounded-2xl p-6 relative group mb-6"
        >
            {/* Drag Handle & Header */}
            <div className="flex items-center gap-3 mb-4">
                <button
                    type="button"
                    {...attributes}
                    {...listeners}
                    className="cursor-grab hover:text-primary-600 text-gray-400 p-1 rounded transition-colors"
                >
                    <GripVertical className="w-5 h-5" />
                </button>
                <span className="font-bold text-gray-400 font-mono text-sm">Q{index + 1}</span>
                <div className="flex-1" />
                <div className="flex gap-2">
                    <button
                        onClick={() => duplicateQuiz(index)}
                        className="p-2 text-gray-400 hover:text-primary-500 transition-colors"
                        title="Duplicate"
                    >
                        <Wand2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => removeQuiz(index)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        title="Delete"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {/* Question Input */}
                <div className="flex items-start gap-3">
                    <div className="flex-1">
                        <input
                            value={quiz.question}
                            onChange={(e) => updateQuiz(index, 'question', e.target.value)}
                            className="w-full bg-transparent border border-gray-200 rounded-lg px-4 py-2 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none text-gray-700 transition-all placeholder:font-normal placeholder:text-gray-400/50"
                            placeholder="Question text (Max 300 chars)"
                            maxLength={300}
                        />
                        <p className={`text-[10px] text-right ${getCounterColor(quiz.question.length, 300)}`}>
                            {quiz.question.length}/300
                        </p>
                    </div>
                </div>

                {/* Scheduled Time Banner */}
                {quiz.scheduledAt && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-xs">
                        <Calendar className="w-3 h-3 text-green-600" />
                        <span className="text-green-700 font-bold">
                            Scheduled: {new Date(quiz.scheduledAt).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short'
                            })}
                        </span>
                    </div>
                )}

                {/* Options List */}
                <div className="pl-8 space-y-2">
                    {quiz.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-2 group/opt">
                            <button
                                onClick={() => updateQuiz(index, 'correctOption', oIdx)}
                                className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold transition-colors ${quiz.correctOption === oIdx ? 'bg-green-500 text-white shadow-md shadow-green-500/20' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
                            >
                                {String.fromCharCode(65 + oIdx)}
                            </button>
                            <div className="flex-1">
                                <input
                                    value={opt}
                                    onChange={(e) => updateOption(index, oIdx, e.target.value)}
                                    className="w-full bg-transparent border border-gray-200 rounded-lg px-3 py-2 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none text-sm text-gray-700 transition-all placeholder:text-gray-400/50"
                                    maxLength={100}
                                    placeholder={`Option ${String.fromCharCode(65 + oIdx)} (Max 100 chars)`}
                                />
                                <p className={`text-[10px] text-right ${getCounterColor(opt.length, 100)}`}>
                                    {opt.length}/100
                                </p>
                            </div>
                            {quiz.options.length > 2 && (
                                <button
                                    onClick={() => removeOption(index, oIdx)}
                                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover/opt:opacity-100 transition-opacity"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    ))}
                    {quiz.options.length < 10 && (
                        <button
                            onClick={() => addOption(index)}
                            className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 mt-2 font-bold transition-colors"
                        >
                            <Plus className="w-3 h-3" /> Add Option
                        </button>
                    )}
                </div>

                {/* Explanation Input */}
                <div className="pl-8">
                    <input
                        value={quiz.explanation}
                        onChange={(e) => updateQuiz(index, 'explanation', e.target.value)}
                        placeholder="Add explanation (optional - Max 200 chars)..."
                        className="w-full bg-transparent text-xs px-3 py-2 rounded-lg text-blue-600 font-medium focus:outline-none focus:ring-1 focus:ring-blue-200 border border-transparent focus:border-blue-100 transition-all placeholder:text-gray-400/50"
                        maxLength={200}
                    />
                    <p className={`text-[10px] text-right mt-1 ${getCounterColor(quiz.explanation?.length || 0, 200)}`}>
                        {quiz.explanation?.length || 0}/200
                    </p>
                </div>
            </div>
        </div>
    );
}
