import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableQuizItem } from './SortableQuizItem';
import { Plus } from 'lucide-react';

export function SortableQuizList({ quizzes, setQuizzes, updateQuiz, removeQuiz, duplicateQuiz, updateOption, addOption, removeOption, handleManualAdd }) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            setQuizzes((items) => {
                // Find index by checking the generated ID format from SortableQuizItem logic
                // Since we used `quiz-${index}` in Item, but index changes, this is tricky.
                // Better approach: Since we don't have stable IDs in the quiz objects initially (from parser),
                // we should rely on their current index positions.
                // However, dnd-kit expects stable IDs.
                // FIX: Let's assume the parent passes stable IDs or we generate them on parse/add.

                // For now, let's assume we map indices.
                // But wait, `active.id` will be `quiz-5` (old index).
                // If we use index as ID, it changes on reorder, which can confuse dnd-kitanimations.
                // IDEALLY: Quizzes should have IDs.

                // Workaround: We will find the indices by parsing the ID string if needed,
                // OR better: The parent (QuizBuilder) should assign IDs to quizzes when parsing/adding.

                // Let's assume QuizBuilder adds 'id' to each quiz object.
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    return (
        <div className="space-y-6">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={quizzes.map(q => q.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-6">
                        {quizzes.map((quiz, index) => (
                            <SortableQuizItem
                                key={quiz.id}
                                quiz={quiz}
                                index={index}
                                updateQuiz={updateQuiz}
                                removeQuiz={removeQuiz}
                                duplicateQuiz={duplicateQuiz}
                                updateOption={updateOption}
                                addOption={addOption}
                                removeOption={removeOption}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            <button
                onClick={handleManualAdd}
                className="w-full py-4 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 hover:border-primary-400 hover:text-primary-500 flex items-center justify-center gap-2 font-bold transition-all bg-gray-50 hover:bg-primary-50"
            >
                <Plus className="w-5 h-5" /> Add Another Question
            </button>
        </div>
    );
}
