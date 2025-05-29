package werti.server.support;

import com.google.common.collect.ImmutableList;
import org.openqa.selenium.By;
import org.openqa.selenium.SearchContext;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.internal.FindsByXPath;
import werti.util.Streams;

import java.io.Serializable;
import java.util.Arrays;
import java.util.List;

import static java.util.stream.Collectors.joining;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-28
 */
public abstract class With extends By {
    public static With partialId(String partialId) {
        check(partialId);
        return new WithPartialId(partialId);
    }

    public static With data(String key, String value) {
        check(key, value);
        return new WithData(key, value);
    }

    private static void check(String... values) {
        for(String value : values) {
            if (value == null || value.length() == 0) {
                throw new IllegalArgumentException("Empty argument for matcher.");
            }
        }
    }

    public static With allOf(By... criterium) {
        return new WithAllOf(criterium);
    }

    private static class WithAllOf extends With implements Serializable {
        private static final long serialVersionUID = 3L;

        private final By[] criteria;

        WithAllOf(By... criterion) {
            this.criteria = criterion;
        }

        @Override
        public List<WebElement> findElements(SearchContext context) {
            return ImmutableList.copyOf(Streams.intersect(
                    Arrays.stream(criteria).map(context::findElements)
            ));
        }

        @Override
        public String toString() {
            return "With.allOf: [" +
                    Arrays.stream(criteria).map(By::toString).collect(joining(", "))
                    + "]";
        }
    }

    private static class WithData extends With implements Serializable {
        private static final long serialVersionUID = 2L;

        private final String key;
        private final String value;

        WithData(final String key, final String value) {
            this.key = key;
            this.value = value;
        }

        @Override
        public List<WebElement> findElements(SearchContext context) {
            final String xpathQuery = "//*[@data-" + key + "='" + value + "']";
            return ((FindsByXPath) context).findElementsByXPath(xpathQuery);
        }

        @Override
        public String toString() {
            return "With.data: " + key + " => " + value;
        }
    }

    private static class WithPartialId extends With implements Serializable {
        private static final long serialVersionUID = 1L;

        private final String partialId;
        WithPartialId(final String partialId) {
            this.partialId = partialId;
        }

        @Override
        public List<WebElement> findElements(SearchContext context) {
            final String xpathQuery = "//*[contains(@id, '" + partialId + "')]";
            return ((FindsByXPath) context).findElementsByXPath(xpathQuery);
        }

        @Override
        public String toString() {
            return "With.partialId: " + partialId;
        }
    }
}
