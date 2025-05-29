package werti.server.support;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.remote.RemoteWebDriver;
import werti.Language;
import werti.server.data.Activity;
import werti.server.data.Topic;

import java.net.URL;
import java.util.List;

import static org.hamcrest.CoreMatchers.is;
import static org.junit.Assert.assertThat;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-26
 */
public class LandingPageDriver extends ViewDriver {
    private static final Logger log = LogManager.getLogger();

    LandingPageDriver(RemoteWebDriver driver, String jettyBaseUrl) {
        super(driver, jettyBaseUrl);
    }

    public void assertCorrectTitle() {
        assertThat(findPageHeading().getText(), is("Welcome to VIEW"));
    }

    public WebElement findPageHeading() {
        return page.findElement(By.tagName("h1"));
    }

    public List<WebElement> findSupportedLanguages() {
        return page.findElements(By.cssSelector(".supported-language"));
    }

    public void goTo() {
        super.goTo("/");
    }

    public List<WebElement> findCurrentTopics() {
        return page.findElements(By.cssSelector(".topic"));
    }

    public void selectLanguage(Language language) {
        log.debug("Choosing language {}.", language.toString());
        this.patientlyFindElement(By.cssSelector(
                "label[for='language-" + language.toString() + "']"
        )).click();
    }

    public void selectTopic(Topic topic) {
        log.debug("Choosing topic {}.", topic.topic());
        this.findUniqueVisibleElement(
                "topic " + topic.topic(),
                By.xpath("//li[contains(@id,'" + topic.topic() + "')]/a")
        ).click();
    }

    public void topicIsVisible(Language language, Topic topic) {
        this.findUniqueVisibleElement(
                "topic " + topic.topic() + " for language " + language.toString(),
                By.id(language.toString() + "-" + topic.topic() + "-panel")
        );
    }

    public void activityIsVisible(Language language, Topic topic, Activity activity) {
        this.findUniqueVisibleElement(
                "activity " + activity.activity() + "/" + topic.topic() + " for language " + language.toString(),
                By.id(language.toString() + "-" + topic.topic() + "-" + activity.activity())
        );
    }

    public void fillInUrl(URL url) {
        log.debug("Filling in url {}.", url.toString());
        page.findElement(By.id("enhance-this")).sendKeys(url.toString());
    }

    public void engageActivity(Language language, Topic topic, Activity activity) {
        log.debug("Engaging activity {}.", activity.activity());
        page.findElement(With.allOf(
                With.data("language", language.toString()),
                With.data("activity", activity.activity()),
                With.data("topic", topic.topic()),
                By.className("activity-start")
        )).click();
    }
}
