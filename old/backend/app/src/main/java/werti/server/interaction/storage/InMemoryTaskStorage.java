package werti.server.interaction.storage;

import werti.server.data.TaskData;
import werti.server.interaction.data.Task;
import werti.server.interaction.authentication.User;
import werti.server.interaction.data.WebPage;

import java.util.Date;
import java.util.List;
import java.util.Optional;

import static java.util.stream.Collectors.toList;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-01-29
 */
public class InMemoryTaskStorage implements TaskStorage {
    private final List<Task> tasks;

    public InMemoryTaskStorage(List<Task> tasks) {
        this.tasks = tasks;
    }

    @Override
    public synchronized Task store(
            TaskData taskData,
            int numberOfExercises,
            WebPage webPage,
            User user,
            Date timestamp
    ) throws ViewStorageException {
        final int taskId = tasks.size();
        final Task task = Task.create(
                user,
                taskId,
                webPage,
                taskData.topic(),
                taskData.activity(),
                taskData.language(),
                taskData.filter(),
                timestamp,
                numberOfExercises
        );

        tasks.add(taskId, task);

        return task;
    }

    @Override
    public Optional<Task> query(int taskId, User user) {
        try {
            return Optional.of(tasks.get(taskId));
        } catch (IndexOutOfBoundsException e) {
            return Optional.empty();
        }
    }

    @Override
    public List<Task> getTasksFor(User user) throws ViewStorageException {
        return tasks.stream().filter(task ->
                task.user().equals(user)
        ).collect(toList());
    }
}
