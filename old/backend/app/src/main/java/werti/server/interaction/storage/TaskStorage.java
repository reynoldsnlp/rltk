package werti.server.interaction.storage;

import werti.server.data.TaskData;
import werti.server.interaction.data.Task;
import werti.server.interaction.authentication.User;
import werti.server.interaction.data.WebPage;

import java.util.Date;
import java.util.List;
import java.util.Optional;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-01-29
 */
public interface TaskStorage {
    Task store(
            TaskData taskData,
            int numberOfExercises,
            WebPage webPage,
            User user,
            Date timestamp
    ) throws ViewStorageException;

    Optional<Task> query(int taskId, User user) throws ViewStorageException;

    List<Task> getTasksFor(User user) throws ViewStorageException;
}
