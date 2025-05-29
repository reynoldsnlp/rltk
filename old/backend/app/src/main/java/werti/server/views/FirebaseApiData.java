package werti.server.views;

import com.google.auto.value.AutoValue;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-03-09
 */
@AutoValue
public abstract class FirebaseApiData {
    public abstract String apiKey();
    public abstract String authDomain();
    public abstract String databaseUrl();
    public abstract String storageBucket();

    public static FirebaseApiData create(String apiKey, String authDomain, String databaseUrl, String storageBucket) {
        return builder()
                .apiKey(apiKey)
                .authDomain(authDomain)
                .databaseUrl(databaseUrl)
                .storageBucket(storageBucket)
                .build();
    }

    public static Builder builder() {
        return new AutoValue_FirebaseApiData.Builder();
    }

    @AutoValue.Builder
    public abstract static class Builder {
        public abstract Builder apiKey(String apiKey);

        public abstract Builder authDomain(String authDomain);

        public abstract Builder databaseUrl(String databaseUrl);

        public abstract Builder storageBucket(String storageBucket);

        public abstract FirebaseApiData build();
    }
}
