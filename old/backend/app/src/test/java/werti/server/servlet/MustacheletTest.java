package werti.server.servlet;

import com.google.common.collect.ImmutableMap;
import com.google.inject.Guice;
import com.google.inject.Inject;
import com.google.inject.name.Named;
import com.google.inject.testing.fieldbinder.Bind;
import com.google.inject.testing.fieldbinder.BoundFieldModule;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnit;
import org.mockito.junit.MockitoRule;
import org.trimou.Mustache;
import org.trimou.engine.MustacheEngine;
import werti.server.servlet.Mustachelet;
import werti.server.views.View;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.PrintWriter;

import static org.mockito.Mockito.*;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-04
 */
public class MustacheletTest {
    @Rule public MockitoRule rule = MockitoJUnit.rule();

    @Bind @Named("mustache-engine") @Mock private MustacheEngine mustacheEngine;
    @Bind @Named("view") @Mock private View view;
    @Inject private Mustachelet mustachelet;

    @Mock private Mustache mustache;
    @Mock private HttpServletRequest request;
    @Mock private HttpServletResponse response;

    @Before
    public void setUp() {
        Guice.createInjector(BoundFieldModule.of(this)).injectMembers(this);
    }

    @Test
    public void doGet() throws Exception {
        // given
        when(request.getServletPath()).thenReturn("/index.html");
        when(mustacheEngine.getMustache("/index")).thenReturn(mustache);
        final PrintWriter writer = mock(PrintWriter.class);
        when(response.getWriter()).thenReturn(writer);

        // when
        mustachelet.doGet(request, response);

        // then
        verify(response).setContentType("text/html");
        verify(response).setCharacterEncoding("UTF-8");
        verify(mustache).render(writer, ImmutableMap.of("view", view));
    }

    @Test
    public void doGet404() throws Exception {
        when(request.getServletPath()).thenReturn("404.html");
        when(mustacheEngine.getMustache("404")).thenReturn(null);
        mustachelet.doGet(request, response);
        verify(response).sendError(HttpServletResponse.SC_NOT_FOUND, "Template 404.html not found.");
    }
}
