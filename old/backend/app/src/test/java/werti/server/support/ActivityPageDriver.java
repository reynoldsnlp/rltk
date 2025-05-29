package werti.server.support;

import com.google.common.collect.ImmutableList;
import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.remote.RemoteWebDriver;
import werti.server.data.Activity;
import werti.server.data.Topic;

import java.util.Collection;
import java.util.List;

import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.stringContainsInOrder;
import static org.junit.Assert.assertThat;

/**
 * A driver for enhanced pages
 * @author Aleksandar Dimitrov
 * @since 2016-10-29
 */
public class ActivityPageDriver extends ViewDriver{
    ActivityPageDriver(RemoteWebDriver driver, String jettyBaseUrl) {
        super(driver, jettyBaseUrl);
    }

    public void assertFrontendResourcesAreLoaded(final Activity activity) {
        final String js = activity.activity() + ".js";
        assertThat(
                "The page contains a reference to the activity's JS",
                page.findElements(By.xpath(
                        "html/body/script[contains(@src,'/js/activity/" + js + "')]"
                )).size(),
                is(1)
        );

        final String css = activity.activity() + ".css";
        assertThat(
                "The page contains a reference to the activitiy's CSS",
                page.findElements(By.xpath(
                        "html/head/link[contains(@href,'/css/activity/" + css + "')]"
                )).size(),
                is(1)
        );
    }

    public void assertEnhancementsArePresent(final Topic topic) {
        assertThat(
                "There are at least some of our spans in the document",
                page.findElements(By.xpath(
                        "//viewEnhancement"
                )).size(),
                is(greaterThan(0))
        );
    }

    public void assertLinksAreAbsolute(Collection<String> relativeLinks) {
        relativeLinks.forEach(
                relativeLink -> {
                    check("src", relativeLink);
                    check("href", relativeLink);
                }
        );
    }

    private void check(final String attribute, final String link) {
        final List<WebElement> elements = page.findElementsByXPath(
                "//*[contains(@" + attribute + ", '" + link + "')]"
        );
        elements.forEach(element -> assertThat(
                "Previously relative link starts with http now",
                element.getAttribute(attribute),
                stringContainsInOrder(ImmutableList.of("http", "://", link))
        ));
    }
}

