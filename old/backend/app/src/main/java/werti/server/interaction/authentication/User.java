package werti.server.interaction.authentication;

import com.google.auto.value.AutoValue;

/**
 * DTO value type for users.
 * @author Aleksandar Dimitrov
 * @since 2017-01-29
 */
@AutoValue
public abstract class User {
    static User create(String userName, String email, String uid) {
        return builder()
                .userName(userName)
                .email(email)
                .uid(uid)
                .build();
    }

    static Builder builder() {
        return new AutoValue_User.Builder();
    }

    public abstract String userName();

    public abstract String email();

    public abstract String uid();

    @AutoValue.Builder
    abstract static class Builder {
        public abstract Builder userName(String userName);

        public abstract Builder email(String email);

        public abstract Builder uid(String uid);

        public abstract User build();
    }
}
