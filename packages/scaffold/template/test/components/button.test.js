import React from "react";
import Button from "../../src/components/Button";
import { shallow } from "enzyme";

describe("Button", () => {
  it("should render children", () => {
    const wrapper = shallow(
      <Button>
        <p>Hello</p>
      </Button>
    );
    expect(wrapper.find("p").length).toBe(1);
  });
});
