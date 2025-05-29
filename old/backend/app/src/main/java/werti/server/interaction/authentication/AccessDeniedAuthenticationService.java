package werti.server.interaction.authentication;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-01-28
 */
public class AccessDeniedAuthenticationService implements AuthenticationService {
    @Override
    public User authenticate(AuthenticationData request) throws AuthenticationException {
        throw new AuthenticationException("Authentication is not possible.");
    }

    @Override
    public String getCustomToken(User user) throws AuthenticationException {
        throw new AuthenticationException("Authentication is not possible.");
    }
}
