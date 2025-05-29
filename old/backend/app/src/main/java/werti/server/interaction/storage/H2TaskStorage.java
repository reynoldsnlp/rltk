package werti.server.interaction.storage;

import com.google.common.collect.ImmutableList;
import com.google.inject.Inject;
import com.google.inject.name.Named;
import org.skife.jdbi.v2.DBI;
import werti.server.data.TaskData;
import werti.server.data.Topics;
import werti.server.interaction.data.Task;
import werti.server.interaction.authentication.User;
import werti.server.interaction.data.WebPage;

import java.util.Date;
import java.util.List;
import java.util.Optional;

/**
 * DAO for {@link TaskStorage} using H2.
 *
 * @author Aleksandar Dimitrov
 * @since 2017-02-19
 */
public class H2TaskStorage implements TaskStorage {
    private final DBI dbi;
    private final Topics topics;

    @Inject
    public H2TaskStorage(
            @Named("h2-dbi") final DBI dbi,
            Topics topics
    ) {
        this.dbi = dbi;
        this.topics = topics;
    }

    @Override
    public Task store(
            final TaskData taskData,
            final int numberOfExercises,
            final WebPage webPage,
            final User user,
            final Date timestamp
    ) throws ViewStorageException {
        final Task task = dbi.withHandle(handle -> {
            final H2TaskDao dao = handle.attach(H2TaskDao.class);
            final int taskId = dao.insertTask(
                    user.uid(),
                    webPage.url().toString(),
                    webPage.title().toString(),
                    taskData.topic().topic(),
                    taskData.activity().activity(),
                    taskData.language().toString(),
                    taskData.filter(),
                    timestamp,
                    numberOfExercises
            );

            handle.registerMapper(new TaskMapper(topics, user));
            final Task retrievedTask = dao.query(taskId);
            dao.close();
            return retrievedTask;
        });

        if (task == null) {
            throw new ViewStorageException(
                    "TaskStorage: Couldn't retrieve task I just created; this is a bug."
            );
        }

        return task;
    }

    @Override
    public Optional<Task> query(final int taskId, User user) throws ViewStorageException {
        return Optional.ofNullable(dbi.withHandle(handle -> {
            handle.registerMapper(new TaskMapper(topics, user));
            return handle.attach(H2TaskDao.class).query(taskId);
        }));
    }

    @Override
    public List<Task> getTasksFor(User user) throws ViewStorageException {
        return dbi.withHandle(handle -> {
            handle.registerMapper(new TaskMapper(topics, user));
            final List<Task> tasks = handle.attach(H2TaskDao.class).getTasksForUser(user.uid());
            if (tasks == null) {
                return ImmutableList.of();
            }
            return tasks;
        });
    }
}
