package werti.server.interaction;

import com.google.inject.Inject;
import werti.server.analysis.ViewRequestException;
import werti.server.data.Topics;
import werti.server.interaction.authentication.AuthenticationService;
import werti.server.interaction.data.Task;
import werti.server.interaction.authentication.User;
import werti.server.interaction.data.WebPage;
import werti.server.interaction.storage.TaskStorage;
import werti.server.interaction.transfer.TaskRequestData;
import werti.server.interaction.transfer.TrackingRequestData;

import java.net.MalformedURLException;
import java.net.URL;
import java.util.Date;
import java.util.List;

/**
 * Validate Task requests and relay valid tasks to storage backend
 *
 * @author Aleksandar Dimitrov
 * @since 2017-01-28
 */
public class TaskService {
    private final Topics topics;
    private final AuthenticationService authenticationService;
    private final TaskStorage tasks;

    @Inject
    public TaskService(
            final Topics topics,
            final AuthenticationService authenticationService,
            final TaskStorage tasks
    ) {
        this.topics = topics;
        this.authenticationService = authenticationService;
        this.tasks = tasks;
    }

    public Task newTask(final TaskRequestData request) throws ViewRequestException {
        final User user = authenticationService.authenticate(request);
        try {
            return tasks.store(
                    topics.getTaskData(
                            request.language(),
                            request.topic(),
                            request.activity(),
                            request.filter()
                    ),
                    request.numberOfExercises(),
                    WebPage.create(new URL(request.url()), request.title()),
                    user,
                    new Date(request.timestamp())
            );
        } catch (MalformedURLException e) {
            throw new ViewRequestException(e);
        }
    }

    public Task getTaskForUser(TrackingRequestData requestData, User user) throws ViewRequestException {
        return getTaskForUser(requestData.taskId(), user);
    }

    public Task getTaskForUser(final int taskId, final User user) throws ViewRequestException {
        return tasks.query(taskId, user)
                    .orElseThrow(() -> new ViewRequestException("No such task: " + taskId));
    }

    public List<Task> getTasksForUser(final User user) throws ViewRequestException {
        return tasks.getTasksFor(user);
    }
}
