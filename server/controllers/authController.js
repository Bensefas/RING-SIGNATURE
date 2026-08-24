const AuthService = require("../services/authService");

const register = async (req, res) => {
    try {
        const user = await AuthService.register(req.body);

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: user
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }
};

const login = async (req, res) => {

    try {

        const { email, password } = req.body;

        const result = await AuthService.login(email, password);

        res.status(200).json({
            success: true,
            message: "Login successful",
            token: result.token,
            user: result.user
        });

    } catch (error) {

        res.status(401).json({
            success: false,
            message: error.message
        });

    }
};

module.exports = {
    register,
    login
};