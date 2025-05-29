package werti.server.servlet;

import com.google.common.base.Stopwatch;
import com.google.gson.Gson;
import com.google.inject.Inject;
import com.google.inject.Singleton;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.jsoup.nodes.Document;
import werti.server.analysis.DocumentAnalysisException;
import werti.server.analysis.HtmlDocumentAnalyser;
import werti.server.analysis.ViewRequestException;
import werti.server.remote.UrlFetcher;
import werti.server.views.DocumentInfo;
import werti.uima.ConvenientCas;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import java.util.concurrent.TimeUnit;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-05
 */
@Singleton
public class Fetchlet extends HttpServlet {
    private final transient Gson gson;
    private final transient UrlFetcher fetcher;
    private final transient HtmlDocumentAnalyser analyser;
    private static final Logger log = LogManager.getLogger();

    @Inject
    Fetchlet(
            final Gson gson,
            final UrlFetcher fetcher,
            HtmlDocumentAnalyser analyser) {
        this.gson = gson;
        this.fetcher = fetcher;
        this.analyser = analyser;
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        resp.setCharacterEncoding("UTF-8");
        resp.setContentType("application/json");
        try {
            handleRequest(req, resp);
        } catch (IOException e) {
            // Responding completely failed, i.e. we can't open the HttpServletResponse object
            // for writing an actual response.
            log.error("Critical: Couldn't send response: ", e);
        }
    }

    /**
     * Handling the actual request is factored out, because both the call to
     * {@link HttpServletResponse#getWriter()} and {@link HttpServletResponse#sendError(int, String)}
     * may throw an {@link IOException}. By factoring out all the code that calls these methods into
     * one helper, we can catch this fatal exception in one central place.
     */
    private void handleRequest(
            final HttpServletRequest request,
            final HttpServletResponse response
    ) throws IOException {
        try {
            final ViewParameters parameters = new FetchQueryParameters(request);
            final Stopwatch timer = Stopwatch.createStarted();
            final Document document = fetcher.getDocument(parameters);
            final ViewRequest viewRequest = ViewRequest.create(parameters, document);
            final ConvenientCas cas = analyser.analyze(viewRequest);
            timer.stop();
            final DocumentInfo documentInfo = DocumentInfo.createFromCas(
                    cas,
                    viewRequest.url(),
                    Duration.ofMillis(timer.elapsed(TimeUnit.MILLISECONDS)),
                    viewRequest.language()
            );
            response.getWriter().write(gson.toJson(documentInfo));
        } catch (ViewRequestException e) {
            log.debug("Error retrieving remote document", e);
            response.sendError(e.getStatus(), e.getMessage());
        } catch (DocumentAnalysisException e) {
            log.error("Error in analysis.", e);
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, e.getMessage());
        }
    }
}
