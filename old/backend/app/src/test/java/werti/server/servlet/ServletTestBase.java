package werti.server.servlet;

import org.junit.Before;
import org.junit.Rule;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnit;
import org.mockito.junit.MockitoRule;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.PrintWriter;

import static org.mockito.Mockito.when;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-20.10.16
 */
abstract class ServletTestBase {
    @Rule public MockitoRule rule = MockitoJUnit.rule();

    @Mock protected HttpServletResponse response;
    @Mock protected HttpServletRequest request;
    @Mock protected PrintWriter responseWriter;

    protected ArgumentCaptor<String> responseCaptor;

    @Before
    public void setUpHttp() throws IOException {
        when(response.getWriter()).thenReturn(responseWriter);
        responseCaptor = ArgumentCaptor.forClass(String.class);
    }
}
