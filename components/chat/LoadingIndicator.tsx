const LoadingIndicator = () => {
  return (
    <div className="flex items-center space-x-1 text-gray-500 my-2">
      <span>Jade est en train d'écrire</span>
      <span className="animate-bounce">.</span>
      <span className="animate-bounce animation-delay-200">.</span>
      <span className="animate-bounce animation-delay-400">.</span>
    </div>
  )
}

export default LoadingIndicator
