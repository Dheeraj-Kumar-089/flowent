import "dotenv/config";
import express from 'express';
import morgan from 'morgan';
import passport from 'passport';
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import cookies from 'cookie-parser';
import cors from 'cors';

import authRoutes from './routes/auth.routes.js';

const app = express();

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookies());
app.use(passport.initialize());

app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

const googleClientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "dummy-client-id";
const googleClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || "dummy-client-secret";

passport.use(new GoogleStrategy({
    clientID: googleClientId,
    clientSecret: googleClientSecret,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback",
    proxy: true
}, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
}));

app.set('trust proxy', 1);

app.get("/_status/healthz", (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.get("/_status/readyz", (req, res) => {
    res.status(200).json({ status: 'ready' });
});

app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

export default app;
