package werti.server.interaction.authentication;

import com.google.firebase.FirebaseApp;
import com.google.firebase.auth.FirebaseAuth;

import java.util.concurrent.CancellationException;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-02-27
 */
public class FirebaseAuthenticationService implements AuthenticationService {
    private final FirebaseAuth firebaseAuth;

    public FirebaseAuthenticationService(FirebaseApp firebaseApp) {
        this.firebaseAuth = FirebaseAuth.getInstance(firebaseApp);
    }

    /**
     * This method <em>will block</em> until it receives its result from the firebase API.
     *
     * @param request Authentication data to verify.
     *
     * @return A verified user, on success
     *
     * @throws AuthenticationException If the user can't be verified.
     */
    @Override
    public User authenticate(AuthenticationData request) throws AuthenticationException {
        final CompletableFuture<User> future = new CompletableFuture<>();

        firebaseAuth.verifyIdToken(request.authenticationToken())
                    .addOnSuccessListener(decodedToken -> future.complete(
                            User.builder()
                                .email(decodedToken.getEmail())
                                .userName(decodedToken.getName())
                                .uid(decodedToken.getUid())
                                .build()
                    ))
                    .addOnFailureListener(future::completeExceptionally);

        try {
            return future.get();
        } catch (CancellationException | ExecutionException | InterruptedException e) {
            throw new AuthenticationException(e);
        }
    }

    public String getCustomToken(User user) throws AuthenticationException {
        final CompletableFuture<String> future = new CompletableFuture<>();

        firebaseAuth.createCustomToken(user.uid())
                    .addOnSuccessListener(future::complete)
                    .addOnFailureListener(future::completeExceptionally);

        try {
            return future.get();
        } catch (CancellationException | InterruptedException | ExecutionException e) {
            throw new AuthenticationException(e);
        }
    }
}
