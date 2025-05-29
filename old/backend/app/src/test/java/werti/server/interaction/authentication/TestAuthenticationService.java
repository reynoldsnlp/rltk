package werti.server.interaction.authentication;

import org.apache.commons.lang.RandomStringUtils;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-04-18
 */
public class TestAuthenticationService {
    public static User createTestUser() {
        final String name  = "test-userName-" + RandomStringUtils.random(8);
        final String email = "test-email-" + RandomStringUtils.random(8);
        final String uid   = "test-uid-" + RandomStringUtils.random(8);

        return User.create(name, email, uid);
    }
}
