package werti.server.support;

import com.google.inject.AbstractModule;
import com.google.inject.Guice;
import com.google.inject.Injector;
import com.google.inject.Provides;
import com.google.inject.name.Named;
import com.google.inject.name.Names;
import com.google.inject.servlet.GuiceFilter;
import io.restassured.RestAssured;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.jetty.server.Connector;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.server.ServerConnector;
import org.eclipse.jetty.servlet.DefaultServlet;
import org.eclipse.jetty.servlet.ServletContextHandler;
import org.eclipse.jetty.util.resource.*;
import org.eclipse.jetty.util.resource.FileResource;
import org.junit.AfterClass;
import org.junit.Before;
import org.junit.BeforeClass;
import org.trimou.engine.MustacheEngine;
import org.trimou.engine.MustacheEngineBuilder;
import org.trimou.engine.config.EngineConfigurationKey;
import org.trimou.engine.interpolation.ThrowingExceptionMissingValueHandler;
import org.trimou.minify.Minify;
import org.trimou.servlet.RequestListener;
import org.trimou.servlet.locator.ServletContextTemplateLocator;
import werti.ViewContext;
import werti.server.ViewTestContext;
import werti.server.interaction.H2TestDatabase;
import werti.server.interaction.authentication.AuthenticationService;
import werti.server.interaction.storage.H2StorageEngine;
import werti.server.modules.*;
import werti.server.remote.UrlFetcher;
import werti.server.views.DefaultView;
import werti.server.views.FirebaseApiData;
import werti.server.views.View;

import javax.servlet.DispatcherType;
import javax.servlet.ServletContext;
import java.io.IOException;
import java.net.ServerSocket;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.EnumSet;

import static org.mockito.Mockito.mock;

/**
 * Base class for testing routes with Jetty.
 *
 * Note, this has just been used for testing REST-routes, not for testing
 * the actual site/app usability. But in general, once the jetty server is
 * running, we basically have a fully functioning VIEW.
 *
 * @author Aleksandar Dimitrov
 * @since 2016-10-08
 */
public class WithJetty {
    private static final Logger log = LogManager.getLogger();
    protected static Injector injector;
    protected static UrlFetcher urlFetcher;

    /* The URL of the Jetty instance for testing */
    protected static final String jettyBaseUrl;
    private static final int port;
    static ServletContextHandler servletContextHandler;
    protected static H2StorageEngine storageEngine;
    protected static AuthenticationService authenticationService;
    protected static H2TestDatabase testDatabase;

    static {
        int openPort = 0;
        for (int portCandidate = 8080; portCandidate < 8100; portCandidate++) {
            try (ServerSocket socket = new ServerSocket(portCandidate)) {
                socket.close();
                openPort = portCandidate;
                log.info("Found open port {}. ", portCandidate);
                break;
            } catch (IOException e) {
                log.info("Tried, but failed to address port " + portCandidate + ".", e);
            }
        }
        if (openPort == 0) {
            throw new RuntimeException("Couldn't find open port!");
        }
        port = openPort;
        jettyBaseUrl = "http://localhost:" + Integer.toString(port);
    }

    @BeforeClass
    public static void startJetty() throws Exception {
        server = new Server(port);
        final Connector connector = new ServerConnector(server);
        server.addConnector(connector);

        urlFetcher = mock(UrlFetcher.class);

        servletContextHandler = new ServletContextHandler(
                server, "/", ServletContextHandler.SESSIONS
        );
        servletContextHandler.addFilter(
                GuiceFilter.class,
                "/*",
                EnumSet.allOf(DispatcherType.class)
        );
        servletContextHandler.addServlet(DefaultServlet.class, "/");
        // Trimou wants a RequestListener added as well
        servletContextHandler.addEventListener(new RequestListener());
        servletContextHandler.setBaseResource(new ResourceCollection(
                FileResource.newResource("src/main/resources"),
                FileResource.newResource("src/main")
        ));
        server.setHandler(servletContextHandler);

        final ServletContext servletContext = servletContextHandler.getServletContext();
        final ViewContext viewContext = ViewTestContext.createTestContext();
        final Path topicsPath = Paths.get(servletContext.getRealPath("/topics"));

        testDatabase = new H2TestDatabase();
        storageEngine = testDatabase.getTestDatabase();
        authenticationService = mock(AuthenticationService.class);

        injector = Guice.createInjector(
                new AbstractModule() {
                    @Override
                    protected void configure() {
                        bind(UrlFetcher.class).toInstance(urlFetcher);
                    }
                },
                new ViewServletModule(viewContext),
                new ViewletModule(),
                new AuthenticationModule(viewContext, authenticationService),
                new AbstractModule() {
                    @Provides @Named("mustache-engine")
                    MustacheEngine provideMustacheEngine() {
                        log.debug("Creating new Mustache engine.");
                        return MustacheEngineBuilder
                                .newBuilder()
                                .setProperty(EngineConfigurationKey.PRECOMPILE_ALL_TEMPLATES, false)
                                .setProperty(EngineConfigurationKey.DEBUG_MODE, true)
                                .setProperty(EngineConfigurationKey.TEMPLATE_CACHE_ENABLED, false)
                                .addTemplateLocator(ServletContextTemplateLocator.builder()
                                                                                 .setRootPath("/html")
                                                                                 .setSuffix("html")
                                                                                 .build())
                                .setMissingValueHandler(new ThrowingExceptionMissingValueHandler())
                                .addMustacheListener(Minify.htmlListener())
                                .build();
                    }
                    @Override
                    protected void configure() {
                        bind(View.class).annotatedWith(Names.named("view")).to(DefaultView.class);
                        bind(FirebaseApiData.class).toInstance(FirebaseApiData.create("","","",""));
                    }
                },
                new UimaModule(1),
                new FeedbackModule(),
                new JdbiDataModule(storageEngine.getDbi()),
                new CacheModule(),
                new TopicModule(topicsPath)
        );

        server.start();
    }

    @Before
    public void resetRestAssured() {
        RestAssured.reset();
        RestAssured.port = port;
    }

    @AfterClass
    public static void stopJetty() throws Exception {
        server.stop();
        server.join();
    }

    private static Server server;
}
