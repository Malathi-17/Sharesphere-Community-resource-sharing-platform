package com.sharespeare.util;

import org.mindrot.jbcrypt.BCrypt;

public class PasswordUtil {

    // Generate a salt and hash the password
    public static String hashPassword(String plainTextPassword) {
        return BCrypt.hashpw(plainTextPassword, BCrypt.gensalt(10));
    }

    // Check if the plain text password matches the hashed password from the
    // database
    public static boolean checkPassword(String plainTextPassword, String hashedPassword) {
        if (hashedPassword == null || !hashedPassword.startsWith("$2a$")) {
            // For backwards compatibility before we added bcrypt
            return plainTextPassword.equals(hashedPassword);
        }
        return BCrypt.checkpw(plainTextPassword, hashedPassword);
    }
}
