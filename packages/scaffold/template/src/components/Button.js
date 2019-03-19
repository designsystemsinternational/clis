import React, { Component } from "react";
import PropTypes from "prop-types";
import classnames from "classnames";
import css from "./Button.css";

export class Button extends Component {
  render() {
    const { variant, onClick, children, disabled } = this.props;
    const classes = classnames(css.root, css[variant]);

    return (
      <button className={classes} onClick={onClick} disabled={disabled}>
        {children}
      </button>
    );
  }
}

export default Button;

Button.propTypes = {
  children: PropTypes.node,
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
  variant: PropTypes.string
};
