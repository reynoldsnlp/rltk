package werti.server.support;

import io.github.bonigarcia.wdm.PhantomJsDriverManager;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.BeforeClass;
import org.junit.Rule;
import org.junit.rules.TestWatcher;
import org.junit.runner.Description;
import org.openqa.selenium.OutputType;
import org.openqa.selenium.phantomjs.PhantomJSDriver;
import org.openqa.selenium.remote.RemoteWebDriver;

import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-27
 */
public class WithFrontend extends WithJetty {
    @Rule public FailedTestRule failedTestRule = new FailedTestRule();
    private static final Logger log = LogManager.getLogger();

    private static RemoteWebDriver driver;
    protected static LandingPageDriver landingPage;
    protected static ActivityPageDriver activityPage;

    private static RemoteWebDriver setUpPhantomJs() {
        PhantomJsDriverManager.getInstance().setup();
        return new PhantomJSDriver();
    }

    @BeforeClass
    public static void setUpDrivers() {
        servletContextHandler.setResourceBase("target/VIEW");
        driver = setUpPhantomJs();
        landingPage = new LandingPageDriver(driver, jettyBaseUrl);
        activityPage = new ActivityPageDriver(driver, jettyBaseUrl);
    }

    private static class FailedTestRule extends TestWatcher {
        private final Document.OutputSettings outputSettings
                = new Document.OutputSettings()
                .charset(Charset.forName("UTF-8"))
                .indentAmount(2)
                .prettyPrint(true);

        public String getHtml() {
            return Jsoup.parse(driver.getPageSource()).outputSettings(outputSettings).outerHtml();
        }

        @Override
        protected void failed(Throwable e, Description description) {
            final Path basePath = Paths.get("target", "reports", description.getClassName());
            final Path screenshot = basePath.resolve(description.getMethodName() + ".png");
            final Path html       = basePath.resolve(description.getMethodName() + ".html");
            try {
                Files.createDirectories(basePath);
                Files.write(html, getHtml().getBytes("utf-8"));
                Files.write(screenshot, driver.getScreenshotAs(OutputType.BYTES));
            } catch (IOException ioe) {
                log.warn(
                        "Couldn't take screenshot or write html for {}, trying to assert: {}",
                        description.getMethodName(),
                        e.getMessage(),
                        ioe
                );
            }
        }
    }
}
