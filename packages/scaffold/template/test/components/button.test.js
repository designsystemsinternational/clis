import React from 'react';
import Button from '../../src/components/Button';
import { shallow } from 'enzyme';

describe('Button', () => {
  it('should render children', () => {
    const wrapper = shallow(
      <Button>
        <span>Hello</span>
      </Button>
    );
    expect(wrapper.find('span').length).toBe(1);
  });
});
