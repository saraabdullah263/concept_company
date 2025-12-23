import logo from '../../assets/logo.png';

const Logo = ({ className = "h-10 w-auto" }) => {
    return (
        <img src={logo} alt="Concept Eco Care" className={className} />
    );
};

export default Logo;
