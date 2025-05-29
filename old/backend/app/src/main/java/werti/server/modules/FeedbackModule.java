package werti.server.modules;

import com.google.inject.AbstractModule;
import com.google.inject.name.Names;
import org.trimou.engine.MustacheEngine;
import org.trimou.engine.MustacheEngineBuilder;
import org.trimou.engine.config.EngineConfigurationKey;
import org.trimou.engine.interpolation.ThrowingExceptionMissingValueHandler;
import org.trimou.handlebars.EqualsHelper;
import org.trimou.handlebars.NumericExpressionHelper;
import org.trimou.minify.Minify;
import org.trimou.servlet.locator.ServletContextTemplateLocator;
import werti.server.interaction.feedback.FeedbackEngine;
import werti.server.interaction.feedback.russian.RussianFeedbackEngine;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-04-22
 */
public class FeedbackModule extends AbstractModule {
    @Override
    protected void configure() {
        final MustacheEngine mustacheEngine =
                MustacheEngineBuilder
                        .newBuilder()
                        .registerHelper("isEq", new EqualsHelper())
                        .registerHelper("numExpr", new NumericExpressionHelper())
                        .setProperty(EngineConfigurationKey.PRECOMPILE_ALL_TEMPLATES, false)
                        .setProperty(EngineConfigurationKey.TEMPLATE_CACHE_ENABLED, false)
                        .addTemplateLocator(ServletContextTemplateLocator
                                .builder()
                                .setRootPath("/html/feedback")
                                .setSuffix("html")
                                .build())
                        .setMissingValueHandler(new ThrowingExceptionMissingValueHandler())
                        .addMustacheListener(Minify.htmlListener())
                        .build();

        bind(MustacheEngine.class).annotatedWith(Names.named("feedback-mustache"))
                                  .toInstance(mustacheEngine);

        bind(FeedbackEngine.class).annotatedWith(Names.named("russian-feedback"))
                                  .to(RussianFeedbackEngine.class);
    }
}
