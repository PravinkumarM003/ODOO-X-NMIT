import os
import sys

# Set up path so we can import from app
sys.path.insert(0, os.path.abspath('backend'))

from sqlalchemy.orm import Session
from app.db.session import engine
from sqlalchemy import text

with Session(engine) as session:
    print("Updating OWNER -> ADMINISTRATOR...")
    session.execute(text("UPDATE User SET role = 'ADMINISTRATOR' WHERE role = 'OWNER'"))
    print("Updating OFFICE -> MANAGER...")
    session.execute(text("UPDATE User SET role = 'MANAGER' WHERE role = 'OFFICE'"))
    session.commit()
    
    print("New Role Distribution:")
    result = session.execute(text("SELECT role, COUNT(*) FROM User GROUP BY role"))
    for row in result:
        print(row)
