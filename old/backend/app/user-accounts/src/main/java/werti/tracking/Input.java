package werti.tracking;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.LinkedList;
import java.util.List;

/**
 * Container for information related to a single interaction with an enhanced
 * page by a particular user. This is used for tracking which user has
 * interacted with which webpages in which way.
 * 
 * An instance of this class corresponds to a row in the table <em>input</em>
 * in the user tracking database. That's why the instance fields here are named
 * after the columns in that table and also have the corresponding types.
 * 
 * Objects of this class are immutable because they are intended for read-only
 * use. All fields are publicly accessible, so there's no need for getter
 * methods.
 * 
 * @author Marion Zepf
 */
public class Input extends Data {

    public final long id;
    /**
     * ID of the corresponding {@link Enhancement}
     */
    public final long enhId;
    public final Timestamp requesttime;
    /**
     * ID of the &lt;span class="wertiview"&gt; around the word that the user
     * clicked on or around the input box
     */
    public final int wertiviewspanid;
    /**
     * Value of the id attribute of the &lt;span class="wertiviewtoken"&gt; or
     * &lt;span class="wertiviewchunk"&gt; that the user clicked on or of the
     * input box or hint button
     */
    public final String wertiviewtokenid;
    /**
     * What the user typed in the input field (practice), selected from the
     * drop-down list (multiple choice) or clicked on (click).
     */
    public final String userinput;
    /**
     * Whether the user's input counts as being correct. An input may count as
     * correct even if it is not string-identical to the canonical answer.
     */
    public final boolean countsascorrect;
    /**
     * The canonical correct answer to this input field. This is null in the
     * click activity.
     */
    public final String correctanswer;
    /**
     * Whether the user clicked on the 'hint' button. This is null in the click
     * activity.
     */
    public final boolean usedhint;

    /**
     * Name of the SQL table corresponding to this class
     */
    public static final String TABLE_NAME = "input";

    /**
     * This is needed for Gson
     */
    public Input() {
        this(-1L, -1L, null, -1, null, null, false, null, false);
    }

    public Input(long id, long enhId, Timestamp requesttime,
            int wertiviewspanid, String wertiviewtokenid, String userinput,
            boolean countsascorrect, String correctanswer, boolean usedhint) {
        this.id = id;
        this.enhId = enhId;
        this.requesttime = requesttime;
        this.wertiviewspanid = wertiviewspanid;
        this.wertiviewtokenid = wertiviewtokenid;
        this.userinput = userinput;
        this.countsascorrect = countsascorrect;
        this.correctanswer = correctanswer;
        this.usedhint = usedhint;
    }

    public Input(long id, long enhId, Timestamp requesttime,
            Input otherFields) {
        this(id, enhId, requesttime, otherFields.wertiviewspanid,
                otherFields.wertiviewtokenid, otherFields.userinput,
                otherFields.countsascorrect, otherFields.correctanswer,
                otherFields.usedhint);
    }

    /**
     * Parse the SQL results into a nice {@link java.util.List} of
     * {@link Input} objects. Return an empty list if the SQL result is null or
     * empty.
     * 
     * Assumes all columns are present and they're in the default order.
     * 
     * @param result
     *            the result returned by a SELECT query
     * @return
     * @throws SQLException
     */
    public static List<Input> parseFromSQLResult(ResultSet result)
            throws SQLException {
        List<Input> inputList = new LinkedList<Input>();
        if (result != null) {
            // for each row
            while (result.next()) {
                // column indices start from 1
                long id = result.getLong(1);
                long enhId = result.getLong(2);
                Timestamp requesttime = result.getTimestamp(3);
                int wertiviewspanid = result.getInt(4);
                String wertiviewtokenid = result.getString(5);
                String userinput = result.getString(6);
                boolean countsascorrect = result.getBoolean(7);
                // the following two might be null
                String correctanswer = result.getString(8);
                Boolean usedhint = result.getBoolean(9);
                Input input = new Input(id, enhId, requesttime,
                        wertiviewspanid, wertiviewtokenid, userinput,
                        countsascorrect, correctanswer, usedhint);
                inputList.add(input);
            }
        }
        return inputList;
    }

    /**
     * Return a string representation of this Input's fields that can be used
     * in INSERT statements in SQL, e.g.,
     * <code>"123, 456, '1970-01-01 00:00:00', 789, 'the', ..."</code> can be
     * used in <code>INSERT INTO input VALUES(...);</code>
     */
    public String toSQLValueListString() {
        StringBuilder sb = new StringBuilder();
        sb.append(this.id);
        sb.append(", ");
        sb.append(this.enhId);
        sb.append(", ");
        if (this.requesttime == null) {
            sb.append("null");
        } else {
            appendQuoted(this.requesttime.toString(), sb);
        }
        sb.append(", ");
        sb.append(this.wertiviewspanid);
        sb.append(", ");
        appendQuoted(this.wertiviewtokenid, sb);
        sb.append(", ");
        appendQuoted(this.userinput, sb);
        sb.append(", ");
        sb.append(this.countsascorrect);
        sb.append(", ");
        appendQuoted(this.correctanswer, sb);
        sb.append(", ");
        sb.append(this.usedhint);
        return sb.toString();
    }
}
