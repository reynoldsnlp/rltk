package werti.server;

import werti.ViewContext;
import werti.ViewContextException;

import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-04-14
 */
public class ViewTestContext {
    public static ViewContext createTestContext() {
        final Path configPath = Paths.get("src/main/config");
        try {
            final ViewContext viewContext = new ViewContext(configPath);
            viewContext.override("resources.base", "src/main/resources/models");
            return viewContext;
        } catch (ViewContextException e) {
            throw new RuntimeException("Couldn't create ViewContext");
        }
    }
}
