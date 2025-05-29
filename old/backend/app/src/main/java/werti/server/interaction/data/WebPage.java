package werti.server.interaction.data;

import com.google.auto.value.AutoValue;

import java.net.URL;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-04-16
 */
@AutoValue
public abstract class WebPage {
    public abstract URL url();
    public abstract String title();

    public static WebPage create(URL url, String title) {
        return new AutoValue_WebPage(url, title);
    }
}
