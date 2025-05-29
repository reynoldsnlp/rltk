package werti.server;

import com.google.inject.Guice;
import com.google.inject.Injector;
import com.google.inject.servlet.GuiceServletContextListener;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.skife.jdbi.v2.DBI;
import werti.ViewContext;
import werti.ViewContextException;
import werti.server.modules.*;

import javax.servlet.ServletContext;
import javax.servlet.ServletContextEvent;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.sql.Driver;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Enumeration;

/**
 *  Central entry-point for the Application.
 *
 * @author Aleksandar Dimitrov
 * @see <a href="https://github.com/google/guice/wiki/ServletModule">
 *     Servlet Module documentation
 *     </a>
 * @since 2016-10-3
 */
public class ViewContextListener extends GuiceServletContextListener {
    private static final Logger log = LogManager.getLogger();
    private Path topicPath;
    private ViewContext viewContext;

    /**
     * We assume that {@link GuiceServletContextListener} keeps to the contract that
     * {@link GuiceServletContextListener#contextInitialized(ServletContextEvent)}
     * is always called before {@link #getInjector()}, otherwise TopicModule will
     * be called with an uninitialized path.
     */
    @Override
    public void contextInitialized(ServletContextEvent servletContextEvent) {
        final ServletContext servletContext = servletContextEvent.getServletContext();
        try {
            viewContext = new ViewContext(servletContext);
        } catch (ViewContextException e) {
            throw new RuntimeException("Couldn't initialize ViewContext.", e);
        }
        this.topicPath = Paths.get(
                servletContextEvent.getServletContext().getRealPath("/topics")
        );
        super.contextInitialized(servletContextEvent);
    }

    @Override
    public void contextDestroyed(ServletContextEvent servletContextEvent) {
        super.contextDestroyed(servletContextEvent);

        // unloading jdbc drivers.
        // See: http://stackoverflow.com/questions/3320400/23912257#23912257
        ClassLoader contextClassLoader = Thread.currentThread().getContextClassLoader();
        // Loop through all drivers
        Enumeration<Driver> drivers = DriverManager.getDrivers();
        while (drivers.hasMoreElements()) {
            Driver driver = drivers.nextElement();
            if (driver.getClass().getClassLoader() == contextClassLoader) {
                // This driver was registered by the webapp's ClassLoader, so deregister it:
                try {
                    log.info("Deregistering JDBC driver {}", driver);
                    DriverManager.deregisterDriver(driver);
                } catch (SQLException ex) {
                    log.error("Error deregistering JDBC driver {}", driver, ex);
                }
            } else {
                // driver was not registered by the webapp's ClassLoader and may be in use elsewhere
                log.trace("Not deregistering JDBC driver {} as it " +
                        "does not belong to this webapp's ClassLoader", driver);
            }
        }
    }

    @Override
    protected Injector getInjector() {
        log.debug("Creating injector");

        final DBI dbi = new StorageEngineDiscovery(viewContext).getDbi();

        return Guice.createInjector(
                new ViewServletModule(viewContext),
                new MustacheletModule(viewContext),
                new UrlModule(),
                new AuthenticationModule(viewContext),
                new UimaModule(),
                new FeedbackModule(),
                new CacheModule(),
                new TopicModule(topicPath),
                new ViewletModule(),
                new JdbiDataModule(dbi)
        );
    }
}
