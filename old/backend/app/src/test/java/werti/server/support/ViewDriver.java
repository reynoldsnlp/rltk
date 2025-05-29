package werti.server.support;

import org.openqa.selenium.By;
import org.openqa.selenium.OutputType;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.remote.RemoteWebDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.stream.Collectors;

import static org.hamcrest.Matchers.is;
import static org.junit.Assert.assertThat;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-26
 */
class ViewDriver {
    final RemoteWebDriver page;
    private final String baseUrl;
    private static final Path REPORT_LOCATION = Paths.get("target", "reports");

    ViewDriver(final RemoteWebDriver driver, String jettyBaseUrl) {
        this.page = driver;
        this.baseUrl = jettyBaseUrl;
    }

    public void takeScreenshot(final Path fileName) throws IOException {
        Files.copy(
                page.getScreenshotAs(OutputType.FILE).toPath(),
                REPORT_LOCATION.resolve(fileName),
                StandardCopyOption.REPLACE_EXISTING
        );
    }

    protected WebElement findUniqueVisibleElement(String documentation, By locator) {
        List<WebElement> elements = page.findElements(locator).stream()
                .filter(WebElement::isDisplayed).collect(Collectors.toList());
        assertThat(
                "There is one and only one visible element for " + documentation,
                elements.size(),
                is(1)
        );
        return elements.get(0);
    }

    public URL currentUrl() throws MalformedURLException {
        return new URL(page.getCurrentUrl());
    }

    /**
     * Find an element and wait for it to become clickable.
     * May throw an unchecked timeout exception if the element does not become clickable.
     *
     * @param criterion The locator for the element
     * @return The element.
     */
    public WebElement patientlyFindElement(final By criterion) {
        final WebDriverWait wait = new WebDriverWait(page, 5);
        return wait.until(ExpectedConditions.elementToBeClickable(criterion));
    }

    void goTo(String path) {
        page.get(baseUrl + path);
    }
}
