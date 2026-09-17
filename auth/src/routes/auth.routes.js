import { Router } from "express";
import User from "../models/user.model.js";
import passport from "passport";
import { sendAuthNotification } from "../config/mq.js";
import jwt from "jsonwebtoken";

const router = Router();

// 1. Google OAuth Initiate
router.get('/google', passport.authenticate('google', {
    session: false,
    scope: ['profile', 'email']
}));

// 2. Google OAuth Callback
router.get('/google/callback', passport.authenticate('google', {
    session: false,
    failureRedirect: '/'
}), async (req, res) => {
    try {
        const { id, displayName, emails, photos } = req.user;
        let user = await User.findOne({ googleId: id });

        if (!user) {
            user = new User({
                googleId: id,
                email: emails?.[0]?.value || '',
                name: displayName || 'User',
                avatar: photos?.[0]?.value || ''
            });
            await user.save();
        }

        await sendAuthNotification({
            userId: user._id,
            action: 'google_login',
            timestamp: new Date(),
            email: emails?.[0]?.value
        });

        // Generate JWT token
        const jwtSecret = process.env.JWT_SECRET || '***REMOVED***';
        const token = jwt.sign(
            { id: user._id, name: user.name, email: user.email, avatar: user.avatar },
            jwtSecret,
            { expiresIn: '7d' }
        );

        // Set token in cookie (works over HTTP and IP/domain)
        res.cookie('token', token, {
            httpOnly: false, // accessible to client for Authorization header
            secure: false,   // allow HTTP in dev/IP mode
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        // Redirect back to main page
        res.redirect('/');
    } catch (err) {
        console.error('Error during Google authentication callback:', err);
        res.redirect('/?auth_error=failed');
    }
});

// 3. Get Current Logged-in User Profile
router.get('/me', async (req, res) => {
    try {
        const token = req.cookies?.token || req.headers['authorization']?.split(' ')[1];
        if (!token) {
            return res.status(200).json({ loggedIn: false, user: null });
        }

        const jwtSecret = process.env.JWT_SECRET || '***REMOVED***';
        const decoded = jwt.verify(token, jwtSecret);
        
        let user = null;
        try {
            user = await User.findById(decoded.id).select('-__v');
        } catch (e) {
            user = decoded;
        }

        return res.status(200).json({
            loggedIn: true,
            user: user || decoded
        });
    } catch (err) {
        return res.status(200).json({ loggedIn: false, user: null });
    }
});

// 4. Logout
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    return res.status(200).json({ message: 'Logged out successfully', loggedIn: false });
});

export default router;