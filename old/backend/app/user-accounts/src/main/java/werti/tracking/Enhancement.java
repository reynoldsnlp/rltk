package werti.tracking;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.LinkedList;
import java.util.List;

import werti.util.PostRequest;

/**
 * Container for information related to a single enhancement that was performed
 * for a particular user. This is used for tracking which user has enhanced
 * which webpages.
 * 
 * An instance of this class corresponds to a row in the table
 * <em>enhancement</em> in the user tracking database. That's why the instance
 * fields here are named after the columns in that table and also have the
 * corresponding types.
 * 
 * Objects of this class are immutable because they are intended for read-only
 * use. All fields are publicly accessible, so there's no need for getter
 * methods.
 * 
 * @author Marion Zepf
 * 
 */
public class Enhancement extends Data {
    public final long id;
    public final Timestamp requesttime;
    public final String username;
    public final String url;
    public final String language;
    public final String topic;
    public final String activity;
    public final String version;
    public final String enhancedspans;
    public final String originalpage;

    /**
     * Name of the SQL table corresponding to this class
     */
    public static final String TABLE_NAME = "enhancement";

    public Enhancement(long id, Timestamp requesttime, String username,
            String url, String language, String topic,
            String activity, String version,
            String enhancedspans, String originalpage) {
        this.id = id;
        this.requesttime = requesttime;
        this.username = username;
        this.url = url;
        this.language = language;
        this.topic = topic;
        this.activity = activity;
        this.version = version;
        this.enhancedspans = enhancedspans;
        this.originalpage = originalpage;
    }

    public Enhancement(long id, Timestamp requesttime, PostRequest requestInfo,
            String enhancedspans, String originalpage) {
        this(id, requesttime, requestInfo.userId, requestInfo.url,
                requestInfo.language, requestInfo.topic, requestInfo.activity,
                requestInfo.version, enhancedspans, originalpage);
    }

    /**
     * Parse the SQL results into a nice {@link java.util.List} of
     * {@link Enhancement} objects. Return an empty list if the SQL result is
     * null or empty.
     * 
     * Assumes all columns are present and they're in the default order.
     * 
     * @param result
     *            the result returned by a SELECT query
     * @return
     * @throws SQLException
     */
    public static List<Enhancement> parseFromSQLResult(ResultSet result)
            throws SQLException {
        List<Enhancement> enhList = new LinkedList<Enhancement>();
        if (result != null) {
            // for each row
            while (result.next()) {
                // column indices start from 1
                long id = result.getLong(1);
                Timestamp requesttime = result.getTimestamp(2);
                String username = result.getString(3);
                String url = result.getString(4);
                String language = result.getString(5);
                String topic = result.getString(6);
                String activity = result.getString(7);
                String version = result.getString(8);
                String enhancedspans = result.getString(9);
                String originalpage = result.getString(10);
                Enhancement enh = new Enhancement(id, requesttime, username, url,
                        language, topic, activity, version, enhancedspans,
                        originalpage);
                enhList.add(enh);
            }
        }
        return enhList;
    }

    /**
     * Return a string representation of this Enhancement's fields that can be
     * used in INSERT statements in SQL, e.g.,
     * <code>"123, '1970-01-01 00:00:00', 'http://wertiviewtest.myopenid.com/', ..."</code>
     * can be used in <code>INSERT INTO enhancement VALUES(...);</code>
     */
    @Override
    public String toSQLValueListString() {
        StringBuilder sb = new StringBuilder();
        sb.append(this.id);
        sb.append(", ");
        appendQuoted(this.requesttime.toString(), sb);
        sb.append(", ");
        appendQuoted(this.username, sb);
        sb.append(", ");
        appendQuoted(this.url, sb);
        sb.append(", ");
        appendQuoted(this.language, sb);
        sb.append(", ");
        appendQuoted(this.topic, sb);
        sb.append(", ");
        appendQuoted(this.activity, sb);
        sb.append(", ");
        appendQuoted(this.version, sb);
        sb.append(", ");
        appendQuoted(this.enhancedspans, sb);
        sb.append(", ");
        appendQuoted(this.originalpage, sb);
        return sb.toString();
    }

}
