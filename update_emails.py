import os, sys
sys.path.insert(0, os.path.abspath('backend'))
from sqlalchemy.orm import Session
from app.db.session import engine
from sqlalchemy import text
with Session(engine) as session:
    session.execute(text("UPDATE User SET email = 'administrator@everest.demo' WHERE email = 'owner@everest.demo'"))
    session.execute(text("UPDATE User SET email = 'manager@everest.demo' WHERE email = 'office@everest.demo'"))
    session.commit()
    print('Emails updated.')
