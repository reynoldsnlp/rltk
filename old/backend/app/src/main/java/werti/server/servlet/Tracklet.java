package werti.server.servlet;

import com.google.gson.Gson;
import com.google.inject.Inject;
import com.google.inject.Singleton;
import com.google.inject.name.Named;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import werti.server.analysis.ViewRequestException;
import werti.server.interaction.SubmissionService;
import werti.server.interaction.authentication.AuthenticationService;
import werti.server.interaction.data.SubmissionResponse;
import werti.server.interaction.data.TaskPerformance;
import werti.server.interaction.authentication.User;
import werti.server.interaction.transfer.PerformanceResponseData;
import werti.server.interaction.transfer.TrackingRequestData;

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
 * @since 2017-01-28
 */
@Singleton
public class Tracklet extends HttpServlet {
    private static final Logger log = LogManager.getLogger();
    private final transient Gson gson;
    private final SubmissionService submissionService;
    private final transient AuthenticationService authenticationService;

    @Inject
    public Tracklet(
            @Named("view-gson") final Gson gson,
            final SubmissionService submissionService,
            final AuthenticationService authenticationService
    ) {
        this.gson = gson;
        this.submissionService = submissionService;
        this.authenticationService = authenticationService;
    }

    @Override
    protected void doPost(
            HttpServletRequest req,
            HttpServletResponse resp
    ) throws ServletException, IOException {
        try {
            resp.setCharacterEncoding("UTF-8");
            resp.setContentType("application/json");
            handlePost(req, resp);
        } catch (IOException e) {
            log.warn("Couldn't write response", e);
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
            log.warn("Couldn't write response", e);
        }
    }

    private void handleGet(
            HttpServletRequest request,
            HttpServletResponse response
    ) throws IOException {
        final String token = request.getParameter("token");
        final String taskId = request.getParameter("taskId");

        try {
            final User user = authenticationService.authenticate(() -> token);
            final List<TaskPerformance> performances =
                    submissionService.getPerformance(Integer.parseInt(taskId), user);
            final List<PerformanceResponseData> responseData = performances
                    .stream().map(PerformanceResponseData::create)
                    .collect(Collectors.toList());
            gson.toJson(responseData, response.getWriter());
        } catch (ViewRequestException e) {
            log.info("Unsuccessful operation.", e);
            response.sendError(e.getStatus(), e.getMessage());
        }
    }

    private void handlePost(
            HttpServletRequest request,
            HttpServletResponse response
    ) throws IOException {
        try (BufferedReader requestReader = request.getReader()) {
            final TrackingRequestData requestData =
                    gson.fromJson(requestReader, TrackingRequestData.class);
            final User user = authenticationService.authenticate(requestData);
            final SubmissionResponse responseData =
                    submissionService.acceptSubmission(requestData, user);
            gson.toJson(responseData, response.getWriter());
        } catch (IOException e) {
            log.debug("Couldn't read response", e);
            response.sendError(
                    HttpServletResponse.SC_BAD_REQUEST,
                    "Couldn't read response"
            );
        } catch (ViewRequestException e) {
            log.debug("Received invalid request", e);
            response.sendError(
                    HttpServletResponse.SC_BAD_REQUEST,
                    "Invalid request: " + e.getCause()
            );
        }
    }
}
