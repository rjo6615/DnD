import React from 'react';
import {Button} from "react-bootstrap";

const PlayerTurnActions = ({ actions, bonusActions, onSelectAction, onSelectBonusAction }) => {
  return (
    <div>
      <h2>Actions</h2>
      <div>
        {actions.map((action) => (
          <Button className="bg-secondary mx-1 mt-1" key={action.id} onClick={() => onSelectAction(action)} style={{ borderColor: "gray", backgroundSize: "cover", backgroundRepeat: "no-repeat", backgroundImage: action.background, height: "40px", width: "40px"}}>
            {/* {action.name} */}
          </Button>
        ))}
      </div>

      <h2>Bonus Actions</h2>
      <div>
        {bonusActions.map((bonusAction) => (
          <Button className="bg-secondary mx-1 mt-1" key={bonusAction.id} onClick={() => onSelectBonusAction(bonusAction)} style={{ borderColor: "gray", backgroundSize: "cover", backgroundRepeat: "no-repeat", backgroundImage: bonusAction.background, height: "40px", width: "40px"}}>
            {/* {bonusAction.name} */}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default PlayerTurnActions;