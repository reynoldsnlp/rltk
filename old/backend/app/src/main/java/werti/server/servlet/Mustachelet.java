package werti.server.servlet;

import com.google.common.collect.ImmutableMap;
import com.google.inject.Inject;
import com.google.inject.Singleton;
import com.google.inject.name.Named;
import org.apache.commons.io.FilenameUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.trimou.Mustache;
import org.trimou.engine.MustacheEngine;
import werti.server.views.View;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * For when you can't grow a full blown framework mustache.
 * A small servlet class which can serve up mustache templates ending in .html
 * We look for them in the /html directory, compile and run them.
 *
 * @author Aleksandar Dimitrov
 * @since 2016-09-25
 */
@Singleton
public class Mustachelet extends HttpServlet {
    private static final Logger log = LogManager.getLogger();
    private final transient MustacheEngine mustacheEngine;
    private final transient View view;

    @Inject
    Mustachelet(
            @Named("mustache-engine") MustacheEngine mustacheEngine,
            @Named("view") View view
    ) {
        this.mustacheEngine = mustacheEngine;
        this.view = view;
    }

    @Override
    protected void doGet(
            HttpServletRequest req,
            HttpServletResponse resp
    ) throws ServletException, IOException {
        resp.setContentType("text/html");
        resp.setCharacterEncoding("UTF-8");
        final String rawServletPath = req.getServletPath();

        /*
         * I don't know how to serve up welcome files with Guice, so that's what we're doing.
         * See: https://github.com/google/guice/issues/810
         */
        final String servletPath = "/".equals(rawServletPath) ? "/index.html" : rawServletPath;

        /*
         * mustacheEngine needs to have its suffix set to .html so it can find other templates
         * to inherit from. But we're getting the file name with the extension, which will con-
         * fuse mustacheEngine. We strip it here, for the benefit of mustacheEngine's sanity.
         */
        final String requestedFile = FilenameUtils.removeExtension(servletPath);
        log.debug("Growing mustache from " + servletPath);
        final Mustache template = mustacheEngine.getMustache(requestedFile);
        try {
            handle(resp, template, servletPath);
        } catch (IOException e) {
            log.error("Error sending response!", e);
        }
    }

    private void handle(
            final HttpServletResponse response,
            final Mustache template,
            final String path
    ) throws IOException {
        if (template != null) {
            template.render(response.getWriter(), ImmutableMap.of("view", view));
        } else {
            response.sendError(
                    HttpServletResponse.SC_NOT_FOUND,
                    "Template " + path + " not found."
            );
        }
    }
}
