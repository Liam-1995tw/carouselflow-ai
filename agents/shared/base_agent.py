from abc import ABC, abstractmethod
from typing import Any


class BaseAgent(ABC):
    name: str = "base"

    @abstractmethod
    async def run(self, *args, **kwargs) -> Any:
        ...

    def __repr__(self):
        return f"<Agent: {self.name}>"
