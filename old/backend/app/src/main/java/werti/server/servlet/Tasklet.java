package werti.server.servlet;

import com.google.gson.Gson;
import com.google.inject.Inject;
import com.google.inject.Singleton;
import com.google.inject.name.Named;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import werti.server.analysis.ViewRequestException;
import werti.server.interaction.TaskService;
import werti.server.interaction.authentication.AuthenticationData;
import werti.server.interaction.authentication.AuthenticationException;
import werti.server.interaction.authentication.AuthenticationService;
import werti.server.interaction.data.Task;
import werti.server.interaction.authentication.User;
import werti.server.interaction.transfer.TaskRequestData;
import werti.server.interaction.transfer.TaskResponseData;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.BufferedReader;
import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-01-27
 */
@Singleton
public class Tasklet extends HttpServlet {
    private static Logger log = LogManager.getLogger();
    private final transient Gson gson;
    private final transient TaskService taskService;
    private final AuthenticationService authenticationService;

    @Inject
    public Tasklet(
            @Named("view-gson") Gson gson,
            TaskService taskService,
            AuthenticationService authenticationService
    ) {
        this.gson = gson;
        this.taskService = taskService;
        this.authenticationService = authenticationService;
    }

    @Override
    protected void doPost(
            HttpServletRequest req,
            HttpServletResponse resp
    ) throws ServletException, IOException {
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");

        try {
            handlePost(req, resp);
        } catch (IOException e) {
            log.error("Critical: IO error while responding.", e);
        }
    }

    @Override
    protected void doGet(
            HttpServletRequest req,
            HttpServletResponse resp
    ) throws ServletException, IOException {
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");

        try {
            handleGet(req, resp);
        } catch (IOException e) {
            log.error("Critical: IO error while responding.", e);
        }
    }

    private void handleGet(
            HttpServletRequest request,
            HttpServletResponse response
    ) throws IOException {
        try {
            final User user = authenticateGetRequest(request);
            final List<Task> tasks = taskService.getTasksForUser(user);
            final List<TaskResponseData> responseList =
                    tasks.stream().map(TaskResponseData::create).collect(Collectors .toList());
            gson.toJson(responseList, response.getWriter());
        } catch (AuthenticationException e) {
            log.info("Failed authentication.", e);
            response.sendError(
                    e.getStatus(),
                    "Cannot authenticate: " + e.getMessage()
            );
        } catch (ViewRequestException e) {
            log.debug("Failed to retrieve tasks.", e);
            response.sendError(
                    e.getStatus(),
                    "Failed to retrieve tasks: " + e.getMessage()
            );
        }
    }

    private User authenticateGetRequest(final HttpServletRequest request) throws AuthenticationException {
        // get parameters: token
        final String token = request.getParameter("token");
        // decode token/authenticate
        final AuthenticationData authenticationData = () -> token;

        return authenticationService.authenticate(authenticationData);
    }

    private Task validateRequest(TaskRequestData request) throws ViewRequestException {
        return taskService.newTask(request);
    }

    private void handlePost(
            HttpServletRequest request,
            HttpServletResponse response
    ) throws IOException {
        try (BufferedReader requestReader = request.getReader()) {
            final TaskRequestData requestData =
                    gson.fromJson(requestReader, TaskRequestData.class);

            final Task task = validateRequest(requestData);

            gson.toJson(TaskResponseData.create(task), response.getWriter());
        } catch (IOException e) {
            log.debug("Error reading request.", e);
            response.sendError(
                    HttpServletResponse.SC_BAD_REQUEST,
                    "Error reading request: " + e.getMessage()
            );
        } catch (ViewRequestException e) {
            log.debug("Got invalid request", e);
            response.sendError(
                    HttpServletResponse.SC_BAD_REQUEST,
                    "Invalid request: " + e.getMessage()
            );
        }
    }
}
