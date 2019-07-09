import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { uid } from '../utils';
import css from './Select.css';

export class Select extends Component {
	constructor(props) {
		super(props);
		this.state = { focus: false };
		this._id = uid('select');
		this.handleOnChange = this.handleOnChange.bind(this);
		this.handleOnFocus = this.handleOnFocus.bind(this);
		this.handleOnBlur = this.handleOnBlur.bind(this);
	}

	handleOnChange(e) {
		const { onChange } = this.props;
		onChange && onChange(e, e.target.name, e.target.value);
	}

	handleOnFocus() {
		this.setState({ focus: true });
	}

	handleOnBlur() {
		this.setState({ focus: false });
	}

	render() {
		const {
			children,
			className,
			defaultValue,
			disabled,
			error,
			id = this._id,
			invalid = false,
			label,
			name,
			placeholder,
			required = false,
			value
		} = this.props;

		const rootClasses = classnames(css.root, {
			[className]: className,
			[css.focus]: this.state.focus,
			[css.withLabel]: label,
			[css.invalid]: invalid,
			[css.disabled]: disabled
		});

		return (
			<Fragment>
				<div className={rootClasses}>
					{label && (
						<label htmlFor={id}>
							<span>{label}:</span>
						</label>
					)}
					<select
						id={id}
						disabled={disabled}
						onChange={this.handleOnChange}
						onFocus={this.handleOnFocus}
						onBlur={this.handleOnBlur}
						name={name}
						placeholder={placeholder}
						value={value}
						aria-required={required}
						aria-describedby={`error-${id}`}
						aria-invalid={invalid}>
						<option disabled>{placeholder}</option>
						{children}
					</select>
				</div>
				{invalid && error && (
					<div className={css.error} id={`error-${id}`} aria-live="polite">
						{error}
					</div>
				)}
			</Fragment>
		);
	}
}

export default Select;

Select.defaultProps = {
	placeholder: 'Select...'
};

Select.propTypes = {
	name: PropTypes.string,
	value: PropTypes.string,
	children: PropTypes.node,
	disabled: PropTypes.bool,
	error: PropTypes.string,
	id: PropTypes.string,
	invalid: PropTypes.bool,
	label: PropTypes.string,
	className: PropTypes.string,
	onChange: PropTypes.func,
	placeholder: PropTypes.string,
	required: PropTypes.bool
};
