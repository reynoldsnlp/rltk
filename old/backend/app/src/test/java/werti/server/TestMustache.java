package werti.server;

import org.trimou.engine.MustacheEngine;
import org.trimou.engine.MustacheEngineBuilder;
import org.trimou.engine.config.EngineConfigurationKey;
import org.trimou.engine.interpolation.ThrowingExceptionMissingValueHandler;
import org.trimou.engine.locator.FileSystemTemplateLocator;
import org.trimou.handlebars.EqualsHelper;
import org.trimou.handlebars.NumericExpressionHelper;
import org.trimou.minify.Minify;

/**
 * A mustache engine to be used in integration tests.
 *
 * @author Aleksandar Dimitrov
 * @since 2017-05-26
 */
public class TestMustache {
    public MustacheEngine getFeedbackMustache() {
        return getEngine("/src/main/html/feedback");
    }

    public MustacheEngine getEngine(final String templatePath) {
        return MustacheEngineBuilder
                .newBuilder()
                .registerHelper("isEq", new EqualsHelper())
                .registerHelper("numExpr", new NumericExpressionHelper())
                .setProperty(EngineConfigurationKey.PRECOMPILE_ALL_TEMPLATES, false)
                .setProperty(EngineConfigurationKey.TEMPLATE_CACHE_ENABLED, false)
                .addTemplateLocator(new FileSystemTemplateLocator(
                        1,
                        System.getProperty("user.dir") + templatePath,
                        "html"))
                .setMissingValueHandler(new ThrowingExceptionMissingValueHandler())
                .addMustacheListener(Minify.htmlListener())
                .build();
    }
}
